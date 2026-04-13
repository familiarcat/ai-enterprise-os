import os
import zipfile
import re
import tempfile
import shutil
import time
import json
from typing import Type, Tuple, Optional, List
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

class UnzipSearchInput(BaseModel):
    """Input for UnzipSearchTool."""
    path: str = Field(..., description="The absolute path to the zip file or folder to search.")
    function_name: str = Field(..., description="The name of the function, class, interface, type, enum, constant, or variable to search for.")
    item_type: str = Field("function", description="The type of item to search for: 'function', 'class', 'interface', 'type', 'enum', 'constant', or 'variable'.")
    max_lines: int = Field(500, description="Maximum number of lines to extract for a single function block.")
    max_seconds: float = Field(30.0, description="Maximum total time in seconds for the search operation.")
    exclude_dirs: Optional[List[str]] = Field(None, description="List of directory names to exclude from search (e.g., node_modules, .git).")
    include_exts: Optional[List[str]] = Field(None, description="List of file extensions to include in search (e.g., .py, .js).")
    return_tree: bool = Field(False, description="Whether to return a tree-like summary of all scanned folders.")
    tree_json_path: Optional[str] = Field(None, description="Absolute path to save the scanned folder tree as a JSON file.")

class UnzipSearchTool(BaseTool):
    name: str = "unzip_and_search_tool"
    description: str = (
        "Useful for searching through folders or zip archives for specific code definitions (functions, classes, etc.). "
        "It handles nested zip files and natural folder structures across .js, .py, .ts, .jsx, and .tsx files."
    )
    args_schema: Type[BaseModel] = UnzipSearchInput

    def _run(self, path: str, function_name: str, item_type: str = "function", max_lines: int = 500, max_seconds: float = 30.0,
             exclude_dirs: Optional[List[str]] = None, include_exts: Optional[List[str]] = None, 
             return_tree: bool = False, tree_json_path: Optional[str] = None) -> str:
        if not os.path.exists(path):
            return f"Error: Path not found at {path}"

        exclude_dirs = exclude_dirs or ["node_modules", ".git", "__pycache__", "venv", "dist", "build"]
        include_exts = include_exts or [".py", ".js", ".ts", ".jsx", ".tsx", ".md", ".sh"]

        # Create a temporary directory for extraction
        temp_dir = tempfile.mkdtemp()
        start_time = time.time()
        timeout_reached = False
        results = []
        scanned_paths = set()

        # Queue of (actual_fs_path, display_label)
        search_queue = []

        try:
            if os.path.isdir(path):
                search_queue.append((path, "root"))
            elif zipfile.is_zipfile(path):
                root_ext = os.path.join(temp_dir, "input_root")
                with zipfile.ZipFile(path, 'r') as z:
                    z.extractall(root_ext)
                search_queue.append((root_ext, os.path.basename(path)))
            else:
                return f"Error: {path} is neither a directory nor a valid zip file."

            it_lower = item_type.lower()
            if it_lower == "class":
                # Class specific patterns (JS/TS and Python)
                patterns = [rf"class\s+{function_name}\b"]
            elif it_lower == "interface":
                # TypeScript interface
                patterns = [rf"interface\s+{function_name}\b"]
            elif it_lower == "type":
                # TypeScript type alias
                patterns = [rf"type\s+{function_name}\b"]
            elif it_lower == "enum":
                # TypeScript enum
                patterns = [rf"enum\s+{function_name}\b"]
            elif it_lower in ["constant", "variable"]:
                # Exported constants or variables (JS/TS and Python)
                patterns = [
                    rf"(?:export\s+)?(?:const|let|var)\s+{function_name}\b",
                    rf"(?:exports|module\.exports|this)\.{function_name}\s*=",
                    rf"^{function_name}\s*="
                ]
            else:
                # Matches: Python def, JS/TS functions, Arrow functions, Object properties, 
                # Shell functions, and Markdown headers.
                patterns = [
                    rf"def\s+{function_name}\s*\(",
                    rf"(?:async\s+)?function\s+{function_name}\s*\(",
                    rf"(?:const|let|var)\s+{function_name}\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>",
                    rf"^\s*(?:(?:public|private|protected|static|async|get|set)\s+)*\*?\s*{function_name}\s*\(",
                    rf"{function_name}\s*:\s*(?:async\s+)?(?:function\b|(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)",
                    rf"[\w$.]+\.{function_name}\s*=\s*(?:async\s+)?(?:function\b|(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)",
                    rf"Object\.defineProperty\s*\(\s*[\w$.]+\s*,\s*['\"]{function_name}['\"]",
                    rf"^\s*(?:(?:public|private|protected|static|readonly)\s+)*{function_name}\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>",
                    rf"\[\s*['\"]{function_name}['\"]\s*\]\s*(?:\(|:\s*(?:async\s+)?(?:function\b|(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>))",
                    rf"^\s*(?:function\s+)?{function_name}\s*(?:\(\s*\))?\s*{{",
                    rf"^#+\s+{function_name}\b"
                ]

            combined_pattern = re.compile("|".join(patterns))

            while search_queue and not timeout_reached:
                current_scan_path, label = search_queue.pop(0)
                
                for root, dirs, files in os.walk(current_scan_path):
                    # Filter out excluded directories in-place to prevent os.walk from entering them
                    if exclude_dirs:
                        dirs[:] = [d for d in dirs if d not in exclude_dirs]

                    logical_root = os.path.join(label, os.path.relpath(root, current_scan_path)).replace("\\", "/")
                    scanned_paths.add(logical_root)

                    if timeout_reached: break
                    for file in files:
                        if time.time() - start_time > max_seconds:
                            results.append(f"... [Search timed out after {max_seconds}s] ...")
                            timeout_reached = True
                            break
                        
                        file_path = os.path.join(root, file)
                        
                        # Handle nested zip files discovered in folders
                        if zipfile.is_zipfile(file_path) and not file_path.startswith(temp_dir):
                            try:
                                nest_ext = os.path.join(temp_dir, f"nest_{int(time.time()*1000)}")
                                with zipfile.ZipFile(file_path, 'r') as z:
                                    z.extractall(nest_ext)
                                search_queue.append((nest_ext, f"{label}/{file}"))
                            except Exception:
                                continue

                        if any(file.endswith(ext) for ext in include_exts):
                            relative_path = os.path.relpath(file_path, current_scan_path)
                            
                            try:
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    it = iter(f)
                                    line = next(it, None)
                                    while line is not None:
                                        if time.time() - start_time > max_seconds:
                                            timeout_reached = True
                                            break

                                        if combined_pattern.search(line):
                                            ext = os.path.splitext(file)[1]
                                            block, line = self._extract_block(line, it, ext, max_lines)
                                            results.append(f"--- Found in {relative_path} (Origin: {label}) ---\n{block.rstrip()}")
                                            if line is None:
                                                line = next(it, None)
                                        else:
                                            line = next(it, None)
                            except Exception:
                                continue

            output = ""
            if not results:
                output = f"{item_type.capitalize()} '{function_name}' not found in the provided archive."
            else:
                output = "\n".join(results)

            if return_tree:
                output += "\n" + self._generate_tree(scanned_paths)

            if tree_json_path:
                tree_dict = {}
                for p in scanned_paths:
                    parts = p.split('/')
                    current = tree_dict
                    for part in parts:
                        current = current.setdefault(part, {})
                try:
                    with open(tree_json_path, 'w', encoding='utf-8') as jf:
                        json.dump(tree_dict, jf, indent=2)
                except Exception as e:
                    output += f"\nWarning: Could not save JSON tree to {tree_json_path}: {str(e)}"

            return output

        except zipfile.BadZipFile:
            return "Error: The file is not a valid zip archive."
        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"
        finally:
            # Clean up the temporary directory
            shutil.rmtree(temp_dir)

    def _generate_tree(self, paths: set) -> str:
        """Generates a tree-like string representation of the scanned logical paths."""
        if not paths: return ""
        sorted_paths = sorted(list(paths))
        tree_lines = ["\n--- Scanned Folders Tree ---"]
        for path in sorted_paths:
            depth = path.count('/')
            name = os.path.basename(path)
            tree_lines.append(f"{'  ' * depth}└── {name}/")
        return "\n".join(tree_lines)

    def _extract_block(self, first_line: str, iterator, extension: str, max_lines: int) -> Tuple[str, Optional[str]]:
        """Extracts the code block starting at first_line based on language syntax."""
        block = [first_line]
        if extension == '.py':
            base_indent = len(first_line) - len(first_line.lstrip())
            for i, line in enumerate(iterator, 1):
                if i > max_lines:
                    block.append("\n... [Max lines reached] ...")
                    return "".join(block), None
                if line.strip() and (len(line) - len(line.lstrip())) <= base_indent:
                    return "".join(block), line
                block.append(line)
            return "".join(block), None
        elif extension == '.md':
            header_match = re.match(r'^(#+)', first_line)
            level = len(header_match.group(1)) if header_match else 0
            for i, line in enumerate(iterator, 1):
                if i > max_lines:
                    block.append("\n... [Max lines reached] ...")
                    return "".join(block), None
                if level > 0:
                    next_header = re.match(r'^(#+)', line)
                    if next_header and len(next_header.group(1)) <= level:
                        return "".join(block), line
                block.append(line)
            return "".join(block), None
        else:
            # Logic for JS/TS/SH (Brace/Paren counting)
            open_char, close_char = '{', '}'
            is_arrow = "=>" in first_line
            
            # Determine delimiters from the first line
            after_start = first_line.split("=>", 1)[1] if is_arrow else first_line
            if is_arrow and "(" in after_start and ("{" not in after_start or after_start.find("(") < after_start.find("{")):
                open_char, close_char = '(', ')'

            balance_count = 0
            has_started = False
            
            # Check initial balance
            opens, closes = after_start.count(open_char), after_start.count(close_char)
            if opens > closes:
                has_started = True
                balance_count = opens - closes
            elif opens > 0 and opens == closes:
                has_started = True
                balance_count = 0
            elif open_char == '{' and ';' in after_start:
                # Handles single-line declarations without braces (e.g., type T = string;)
                return "".join(block), None
            
            # Consume iterator to find start or complete block
            line_idx = 0
            while (not has_started or balance_count > 0) and line_idx < max_lines:
                try:
                    line = next(iterator)
                    line_idx += 1
                    block.append(line)
                    
                    if not has_started:
                        stripped = line.strip()
                        if not stripped: continue
                        
                        if is_arrow:
                            if stripped.startswith('('): open_char, close_char = '(', ')'
                            elif not stripped.startswith('{'): break # Single line arrow
                        
                        if open_char in line:
                            has_started = True
                            balance_count = line.count(open_char) - line.count(close_char)
                    else:
                        balance_count += line.count(open_char)
                        balance_count -= line.count(close_char)
                    
                    if has_started and balance_count <= 0:
                        return "".join(block), None
                    if not has_started and line_idx > 20: break # Too much lookahead
                except StopIteration:
                    break
            else:
                if balance_count > 0:
                    block.append("\n... [Max lines reached] ...")
            
            return "".join(block), None

if __name__ == "__main__":
    import sys
    try:
        # Read JSON from stdin to support larger input payloads without shell limits
        input_data = sys.stdin.read().strip()
        if input_data:
            args = json.loads(input_data)
            tool = UnzipSearchTool()
            print(tool._run(**args))
    except Exception as e:
        sys.stderr.write(f"Tool Error: {str(e)}\n")
        sys.exit(1)