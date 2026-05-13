import sys
import json
import os
import requests
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

# Central registry of available MCP tools for the "Envelope" architecture
BEST_OF_BREED_MCP_REGISTRY = {
    "mcp_registry": "Official community-driven registry (registry.modelcontextprotocol.io) - Use for searching production-ready tools.",
    "smithery": "Open-source registry and installer for 200+ servers (smithery.ai) - Use for rapid tool onboarding.",
    "awesome_mcp": "Curated community list of experimental and production MCP servers (GitHub: awesome-mcp-servers).",
    "github_mcp": "Official tool for querying repositories, PRs, and issues.",
    "filesystem_mcp": "High-performance local file operations.",
    "postgres_mcp": "Direct DB querying and schema analysis.",
    "fetch_mcp": "Web scraping and official Firecrawl ingestion logic.",
    "brave_search": "Real-time technical search via Brave or Perplexity AI.",
    "opentabs": "Integration for Slack, Jira, and Gmail sessions.",
    "code_context": "Semantic search over local Git repositories.",
    "memory_alpha": "Internal Star Trek canonical lore and persona logic.",
    "youtube_transcript": "Deep video content analysis."
}

def get_verified_mcp_tools():
    """
    Queries the local MCP Bridge to see what is actually installed and online.
    """
    bridge_url = os.getenv("MCP_BRIDGE_URL", "http://localhost:3002/tools")
    verified = {}
    try:
        # Attempt to fetch tools from the bridge's registry
        response = requests.get(bridge_url, timeout=2)
        if response.status_code == 200:
            installed_tools = response.json().get("tools", [])
            # Cross-reference our Best of Breed list with the Bridge output
            for key, desc in BEST_OF_BREED_MCP_REGISTRY.items():
                if any(key in t.get('name', '').lower() for t in installed_tools):
                    verified[key] = desc
            return verified
    except Exception:
        return {} # Return empty if bridge is down; logic will fallback to internal tools
    return verified

def run_crew(task_description, agents_config, metadata=None, model=None, expected_output=None):
    """
    Dynamically assembles a crew based on the provided configuration.
    """
    metadata = metadata or {}
    stage = metadata.get('stage', 'execution')
    selected_model = model or os.getenv("CREW_MODEL", "anthropic/claude-3-sonnet")

    # Configure OpenRouter via LangChain
    llm = ChatOpenAI(
        model=selected_model,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Sovereign Factory Crew"
        }
    )

    created_agents = []
    for agent_cfg in agents_config:
        agent = Agent(
            role=agent_cfg.get('role'),
            goal=agent_cfg.get('goal'),
            backstory=agent_cfg.get('backstory'),
            allow_delegation=agent_cfg.get('allow_delegation', False),
            verbose=True,
            llm=llm
        )
        created_agents.append(agent)

    # Define the primary task
    if not expected_output:
        expected_output = "A comprehensive implementation plan or code block based on the mission objective."
        if stage == 'reflection':
            # Align expected output with v11 reflection engine requirements
            expected_output = "A critical audit report including a quality score (1-10), identified weaknesses, and specific improvement recommendations."

    main_task = Task(
        description=task_description,
        agent=created_agents[0], # Lead agent
        expected_output=expected_output
    )

    # Instantiate the Crew
    crew = Crew(
        agents=created_agents,
        tasks=[main_task],
        process=Process.sequential,
        verbose=True
    )

    return crew.kickoff()

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read().strip()
        if not input_data:
            sys.exit(0)
            
        config = json.loads(input_data)
        
        # Refactored to accept standard MCPContext and Orchestrator payload formats
        # Prioritize 'task' from context, fallback to legacy 'objective'
        task_description = config.get('task') or config.get('objective')
        persona = config.get('persona', 'captain_picard')
        context_window = config.get('context', '')  # Historical memory string
        constraints = config.get('constraints', [])
        model_override = config.get('model')
        metadata = config.get('metadata', {})
        expected_output_override = config.get('expected_output')
        stage = metadata.get('stage', 'execution')
        
        if not task_description:
            raise ValueError("Missing 'task' or 'objective' in payload.")

        # Rapid Health Check / Ping
        if task_description == "__ping__":
            print(json.dumps({"status": "success", "output": "pong", "mcp_bridge_status": "online" if get_verified_mcp_tools() else "offline"}))
            sys.exit(0)

        # Extract structured agents or wrap the persona into a default mission lead
        agents_data = config.get('agents', [])
        if not agents_data:
            # Verification Step: Only tell agents about tools that are actually online
            verified_tools = get_verified_mcp_tools()
            if not verified_tools:
                mcp_context = "WARNING: MCP Bridge is offline. Only internal local tools are available."
            else:
                mcp_context = "\n".join([f"- {k}: {v}" for k, v in verified_tools.items()])
            
            # Check for specific tool request in constraints
            required_tool = metadata.get('required_tool')
            if required_tool and required_tool not in verified_tools:
                raise ValueError(f"Required tool '{required_tool}' is not installed or the MCP Bridge is offline.")

            safe_constraints = constraints if isinstance(constraints, list) else [str(constraints)]
            agents_data = [{
                'role': persona,
                'goal': task_description,
                'backstory': (
                    f"Operational context: {context_window}. Tactical constraints: {', '.join(safe_constraints)}.\n\n"
                    f"Available MCP Tools in your Envelope:\n{mcp_context}\n"
                    "DISCOVERY LOGIC: You are a sovereign agent. If the provided tools are insufficient, search the 'mcp_registry' or 'smithery' "
                    "for a server.json schema that matches your requirements. Select tools that align with your specialized skills.\n"
                    "You are authorized to request the use of these tools by name in your output if the mission requires it."
                )
            }]

        # Inject stage-specific prompting for better internal agent reflection
        if stage == 'reflection':
            for agent in agents_data:
                orig_backstory = agent.get('backstory') or ""
                agent['backstory'] = f"[V11 REFLECTION ENGINE] {orig_backstory} Your primary directive is critical evaluation. Identify weaknesses, security risks, and technical debt."

        result = run_crew(
            task_description, 
            agents_data, 
            metadata=metadata, 
            model=model_override,
            expected_output=expected_output_override
        )
        
        # Return result as JSON to stdout
        print(json.dumps({
            "status": "success",
            "output": str(result)
        }))
        
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "error": str(e)
        }))
        sys.exit(1)