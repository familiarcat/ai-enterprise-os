import sys
import json
import os
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

def run_crew(task_description, agents_config):
    """
    Dynamically assembles a crew based on the provided configuration.
    """
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
    main_task = Task(
        description=task_description,
        agent=created_agents[0], # Lead agent
        expected_output="A comprehensive implementation plan or code block based on the mission objective."
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
        
        # Required keys: objective, agents
        objective = config.get('objective')
        agents_data = config.get('agents', [])
        
        if not objective or not agents_data:
            raise ValueError("Missing 'objective' or 'agents' in payload.")

        result = run_crew(objective, agents_data)
        
        # Return result as JSON to stdout
        print(json.dumps({
            "status": "success",
            "output": str(result)
        }))
        
    except Exception as e:
        sys.stderr.write(f"Crew Error: {str(e)}\n")
        sys.exit(1)