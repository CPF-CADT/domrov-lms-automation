"""
Module for generating prompts for an AI model based on file structure and user questions.
"""

from ai.prompt.rubic_convert import rubric_to_plain_text
from utils.read_file import build_directory_tree, collected_file_content


with open('ai/prompt/template', 'r') as f:
    TEMPLATE = f.read()

def generate_prompt(rubric: list, tree_view: str, file_contents: str) -> str:
    """
    Generate a prompt based on the already-processed strings.

    Args:
        rubric (list): The list of instructions/rubric items.
        tree_view (str): The string representation of the directory tree.
        file_contents (str): The concatenated string of file contents.

    Returns:
        str: The generated prompt.
    """
    rubric_text = rubric_to_plain_text(rubric)

    prompt = TEMPLATE.replace("<INSTRUCTION>", rubric_text)
    prompt = prompt.replace("<FILE_TREE>", tree_view)
    prompt = prompt.replace("<DETAILT>", file_contents)

    return prompt