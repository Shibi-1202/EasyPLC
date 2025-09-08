from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# This import connects the API to your main backend logic file.
from .retrieve_generate import generate_full_project_from_nl

app = FastAPI(
    title="PLC Code Generation API",
    description="An API to generate Structured Text and PLCopen XML from natural language.",
    version="2.0.0",
)

# This allows your frontend application to make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you should restrict this to your frontend's domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Defines the structure of the incoming request JSON.
class NLRequest(BaseModel):
    nl: str

# Defines the structure of a successful response JSON.
class CodeResponse(BaseModel):
    st_code: str
    xml_code: str

@app.post("/generate", response_model=CodeResponse)
async def generate_code(req: NLRequest):
    """
    Receives a natural language request and returns the generated Structured Text
    and its corresponding PLCopen XML representation.
    """
    try:
        # Unpack the two values directly from your function's return
        st_code, xml_code = generate_full_project_from_nl(req.nl)

        # Check for an error (our function returns (error_message, None) on failure)
        if xml_code is None:
            # The st_code variable now holds the error message
            raise HTTPException(status_code=500, detail=f"Failed to generate code: {st_code}")

        # If successful, return the generated code
        return {
            "st_code": st_code,
            "xml_code": xml_code,
        }

    except Exception as e:
        # Catch any other unexpected errors
        print(f"An unexpected API error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")
