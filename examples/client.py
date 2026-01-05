#!/usr/bin/env python3
"""
Example Python client for the Clarifying Questions MCP Server.
Demonstrates both streaming and non-streaming question generation.
"""

import requests
import json
import sys
from typing import Dict, List, Optional


class ClarifyingQuestionsClient:
    def __init__(self, base_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.base_url = base_url
        self.api_key = api_key
        self.session_id: Optional[str] = None
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with optional authentication."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    def check_health(self) -> bool:
        """Check if the server is healthy."""
        try:
            response = requests.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Server health check failed: {e}")
            return False
    
    def generate_questions(self, task_description: str) -> Dict:
        """Generate questions (non-streaming)."""
        response = requests.post(
            f"{self.base_url}/api/generate",
            headers=self._get_headers(),
            json={"taskDescription": task_description}
        )
        response.raise_for_status()
        data = response.json()
        self.session_id = data["sessionId"]
        return data
    
    def stream_questions(self, task_description: str):
        """Generate questions with streaming (requires sseclient library)."""
        try:
            from sseclient import SSEClient
        except ImportError:
            print("❌ sseclient library required for streaming.")
            print("   Install with: pip install sseclient-py")
            sys.exit(1)
        
        url = f"{self.base_url}/api/stream"
        params = {"taskDescription": task_description}
        
        response = requests.get(url, params=params, headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else None, stream=True)
        client = SSEClient(response)
        
        questions = []
        
        for event in client.events():
            if event.event == "start":
                data = json.loads(event.data)
                print(f"🚀 {data['message']}")
            
            elif event.event == "question":
                question = json.loads(event.data)
                questions.append(question)
                yield question
            
            elif event.event == "complete":
                data = json.loads(event.data)
                self.session_id = data["sessionId"]
                print(f"✅ Generated {data['questionCount']} questions")
                print(f"   Session ID: {self.session_id}\n")
            
            elif event.event == "error":
                data = json.loads(event.data)
                print(f"❌ Error: {data['error']}")
                break
    
    def answer_question(self, question_id: str, answer: str) -> Dict:
        """Submit an answer to a question."""
        if not self.session_id:
            raise ValueError("No active session. Generate questions first.")
        
        response = requests.post(
            f"{self.base_url}/api/answer",
            headers=self._get_headers(),
            json={
                "sessionId": self.session_id,
                "questionId": question_id,
                "answer": answer
            }
        )
        response.raise_for_status()
        return response.json()
    
    def get_context(self) -> Dict:
        """Retrieve the complete task context."""
        if not self.session_id:
            raise ValueError("No active session. Generate questions first.")
        
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        response = requests.get(f"{self.base_url}/api/context/{self.session_id}", headers=headers)
        response.raise_for_status()
        return response.json()
    
    def list_sessions(self) -> Dict:
        """List all active sessions."""
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        response = requests.get(f"{self.base_url}/api/sessions", headers=headers)
        response.raise_for_status()
        return response.json()


def print_question(question: Dict, index: int):
    """Pretty print a question."""
    print(f"\n{'='*60}")
    print(f"Question {index}: {question['text']}")
    print(f"Category: {question['category']}")
    print(f"{'='*60}")
    for i, option in enumerate(question['options'], 1):
        print(f"  {i}. {option}")
    print()


def interactive_demo():
    """Run an interactive demo."""
    import os
    api_key = os.environ.get("MCP_API_KEY")
    client = ClarifyingQuestionsClient(api_key=api_key)
    
    print("🤔 Clarifying Questions Client - Interactive Demo")
    print("=" * 60)
    
    # Check server health
    if not client.check_health():
        print("\n❌ Server is not running!")
        print("   Start it with: npm start http")
        sys.exit(1)
    
    print("✅ Server is healthy\n")
    
    # Get task description
    task = input("What would you like to build? ")
    if not task.strip():
        task = "make me a website that runs pseudocode"
        print(f"Using example: {task}")
    
    print(f"\n📝 Task: {task}\n")
    
    # Ask for streaming preference
    use_streaming = input("Use streaming? (y/n) [y]: ").lower() != 'n'
    
    questions = []
    
    if use_streaming:
        print("\n🔄 Streaming questions...\n")
        for i, question in enumerate(client.stream_questions(task), 1):
            questions.append(question)
            print(f"📥 Received question {i}: {question['text']}")
    else:
        print("\n⏳ Generating questions...\n")
        data = client.generate_questions(task)
        questions = data['questions']
        print(f"✅ Generated {len(questions)} questions\n")
    
    # Answer questions
    responses = {}
    
    for i, question in enumerate(questions, 1):
        print_question(question, i)
        
        while True:
            choice = input(f"Select option (1-{len(question['options'])}): ")
            try:
                choice_idx = int(choice) - 1
                if 0 <= choice_idx < len(question['options']):
                    answer = question['options'][choice_idx]
                    break
                else:
                    print("❌ Invalid option number")
            except ValueError:
                print("❌ Please enter a number")
        
        # Submit answer
        result = client.answer_question(question['id'], answer)
        responses[question['id']] = answer
        
        progress = result['progress']
        print(f"\n✅ Answer recorded: {answer}")
        print(f"   Progress: {progress['answered']}/{progress['total']} ({progress['percentage']}%)")
    
    # Get final context
    print("\n" + "=" * 60)
    print("📋 COMPLETE TASK CONTEXT")
    print("=" * 60)
    
    context = client.get_context()
    
    print(f"\nTask: {context['taskDescription']}")
    print(f"Session ID: {context['sessionId']}")
    print(f"Progress: {context['progress']['answered']}/{context['progress']['total']}")
    print("\nResponses:")
    
    for question in context['questions']:
        answer = context['responses'].get(question['id'])
        if answer:
            print(f"\n  Q: {question['text']}")
            print(f"  A: {answer}")
    
    print("\n" + "=" * 60)
    print("✅ Demo complete!")


def non_interactive_demo():
    """Run a non-interactive demo with predefined answers."""
    import os
    api_key = os.environ.get("MCP_API_KEY")
    client = ClarifyingQuestionsClient(api_key=api_key)
    
    print("🤔 Clarifying Questions Client - Automated Demo")
    print("=" * 60)
    
    task = "make me a website that runs pseudocode"
    print(f"\n📝 Task: {task}\n")
    
    # Generate questions
    data = client.generate_questions(task)
    questions = data['questions']
    
    print(f"✅ Generated {len(questions)} questions\n")
    
    # Predefined answers (select first option for each)
    for i, question in enumerate(questions, 1):
        print_question(question, i)
        
        # Select first option
        answer = question['options'][0]
        print(f"🤖 Auto-selecting: {answer}")
        
        result = client.answer_question(question['id'], answer)
        progress = result['progress']
        print(f"   Progress: {progress['answered']}/{progress['total']}")
    
    # Get final context
    context = client.get_context()
    
    print("\n" + "=" * 60)
    print("📋 FINAL CONTEXT")
    print("=" * 60)
    print(json.dumps(context, indent=2))


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        non_interactive_demo()
    else:
        interactive_demo()
