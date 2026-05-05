import sys
import json
import requests
from bs4 import BeautifulSoup
import os

def scrape_memory_alpha(character_name):
    """Fetches character lore from Memory Alpha."""
    # Normalise character name for URL (e.g., "Jean-Luc Picard" -> "Jean-Luc_Picard")
    formatted_name = character_name.replace(' ', '_')
    search_url = f"https://memory-alpha.fandom.com/wiki/{formatted_name}"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (SovereignFactory/1.0; AI Agent Research)'
        }
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None, f"Character page not found for '{character_name}' (Status {response.status_code})"
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Clean up the soup to remove non-lore elements
        for s in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            s.decompose()

        content_div = soup.find('div', {'class': 'mw-parser-output'})
        if not content_div:
            return None, "Could not find main content on page."
        
        # Extract text from paragraphs while avoiding short snippets/nav links
        paragraphs = content_div.find_all('p', recursive=False)
        text_content = "\n".join([p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 20])
        
        return text_content[:5000], None # Limit context for LLM stability
    except Exception as e:
        return None, str(e)

def distill_traits(lore_text, persona_name):
    """Uses OpenRouter to distill lore into pragmatic persona traits."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None, "OPENROUTER_API_KEY not found in environment"
    
    prompt = f"""
    You are an expert in Star Trek lore and AI Agent Engineering.
    
    LORE FOR {persona_name}:
    {lore_text}
    
    TASK:
    Distill the character's core personality, professional expertise, and famous catchphrases into "Pragmatic Persona Traits" for a Software Engineering Agent.
    Focus on how their unique Star Trek attributes translate into specific technical skills (e.g. Architecting, Security Auditing, Debugging, Cost Optimization).
    
    Output strictly in JSON format:
    {{
        "persona": "{persona_name}",
        "role_summary": "A concise summary of their professional identity in a software team.",
        "traits": ["List of distinct personality/technical traits."],
        "pragmatic_directives": ["A list of rules this agent follows based on their Star Trek persona."]
    }}
    """
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/familiarcat/ai-enterprise-os"
            },
            json={
                "model": "anthropic/claude-3-haiku", 
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            },
            timeout=30
        )
        
        if response.status_code == 200:
            content = response.json()['choices'][0]['message']['content']
            # Remove markdown delimiters if the LLM includes them
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content), None
        else:
            return None, f"LLM API failed (Status {response.status_code}): {response.text}"
    except Exception as e:
        return None, str(e)

if __name__ == "__main__":
    try:
        # Expecting JSON via stdin: {"persona_name": "Jean-Luc Picard"}
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)
            
        args = json.loads(input_data)
        persona_name = args.get("persona_name", "")
        
        if not persona_name:
            print(json.dumps({"success": False, "error": "persona_name is required"}))
            sys.exit(1)

        lore, err = scrape_memory_alpha(persona_name)
        if err:
            print(json.dumps({"success": False, "error": err}))
            sys.exit(1)
            
        result, err = distill_traits(lore, persona_name)
        if err:
            print(json.dumps({"success": False, "error": err}))
            sys.exit(1)
            
        result["success"] = True
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)