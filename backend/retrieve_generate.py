import os
import re
import json
import google.generativeai as genai

# Import your two helper modules for the conversion pipeline
from st_to_ladder_lark import translate_st_to_ir
from ir_to_plcopen_xml import translate_ir_to_xml

# Configure Gemini API - it's best practice to use environment variables
genai.configure(api_key="AIzaSyAGLa_bGE3COoZ0wV0Vf_H5BLz-NhDsLd0")

PROMPT_TEMPLATE = """
You are an expert PLC programmer. Your task is to convert natural language into the body of an IEC 61131-3 Structured Text (ST) program.

User requirement:
{nl}

--- OUTPUT INSTRUCTIONS ---
- Generate ONLY the code that would go inside a PROGRAM block.
- Do NOT include 'PROGRAM', 'VAR', or 'END_PROGRAM'.
- Do NOT wrap the code in Markdown fences like ```. also no comments like (#,//,''')
- Do NOT wrap the code in parentheses.
- Ensure the logic is complete and correct based on the user's request.
- Each statement must end with a semicolon.
"""

def generate_full_project_from_nl(nl_text: str):
    """
    Orchestrates the full pipeline from NL -> ST -> IR -> PLCopen XML.
    """
    try:
        # Step 1: Call the Gemini model to generate the Structured Text
        gm = genai.GenerativeModel("gemini-1.5-flash")
        prompt = PROMPT_TEMPLATE.format(nl=nl_text)
        resp = gm.generate_content(prompt, generation_config={"temperature": 0.0})
        
        raw_text = resp.text
        
        # --- FIX: Enhanced cleaning step to also remove surrounding parentheses ---
        # 1. Remove Markdown fences.
        st_code = re.sub(r'```[a-zA-Z]*', '', raw_text).strip()
        # 2. Remove any surrounding parentheses that the model might add.
        st_code = st_code.strip().strip('()').strip()


        # if not st_code:
        #     raise ValueError("LLM failed to generate valid ST code.")

        # # Step 2: Use your Lark parser to convert the ST code into an Intermediate Representation (IR)
        # st_ir = translate_st_to_ir(st_code)
        # if st_ir.get("type") == "error":
        #     # Pass the more detailed Lark error message back to the frontend
        #     raise ValueError(f"Failed to parse generated ST code: {st_ir.get('message')}")

        # # Step 3: Use your XML converter to translate the IR into a PLCopen XML string
        # xml_code = translate_ir_to_xml(st_ir)

        # Return the final dictionary with both the human-readable ST and the machine-readable XML
        return {
            "st_code": st_code,
            # "xml_code": xml_code,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

# Example for local testing
if __name__ == '__main__':
    natural_language_input = "If StartButton is pressed, then turn on the Motor."
    result = generate_full_project_from_nl(natural_language_input)
    
    if "error" in result:
        print(f"An error occurred: {result['error']}")
    else:
        print("--- Generated Structured Text ---")
        print(result['st_code'])
        print("\n--- Generated PLCopen XML ---")
        print(result['xml_code'])

