import sys
import json
import os
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

def run_crew(task_description, agents_config, metadata=None):
    """
    Dynamically assembles a crew based on the provided configuration.
    """
    metadata = metadata or {}
    stage = metadata.get('stage', 'execution')

    # Configure OpenRouter via LangChain
    llm = ChatOpenAI(
        model=os.getenv("CREW_MODEL", "anthropic/claude-3-sonnet"),
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
        stage = metadata.get('stage', 'execution')
        
        if not task_description:
            raise ValueError("Missing 'task' or 'objective' in payload.")

        # Ensure the selected model is used by the LangChain/CrewAI logic
        if model_override:
            os.environ["CREW_MODEL"] = model_override

        # Extract structured agents or wrap the persona into a default mission lead
        agents_data = config.get('agents', [])
        if not agents_data:
            agents_data = [{
                'role': persona,
                'goal': task_description,
                'backstory': f"Operational context: {context_window}. Tactical constraints: {', '.join(constraints)}"
            }]

        # Inject stage-specific prompting for better internal agent reflection
        if stage == 'reflection':
            for agent in agents_data:
                orig_backstory = agent.get('backstory') or ""
                agent['backstory'] = f"[V11 REFLECTION ENGINE] {orig_backstory} Your primary directive is critical evaluation. Identify weaknesses, security risks, and technical debt."

        result = run_crew(task_description, agents_data, metadata=metadata)
        
        # Return result as JSON to stdout
        print(json.dumps({
            "status": "success",
            "output": str(result)
        }))
        
    except Exception as e:
        sys.stderr.write(f"Crew Error: {str(e)}\n")
        sys.exit(1)