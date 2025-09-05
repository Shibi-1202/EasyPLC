from lark import Lark, Transformer, v_args

# --- 1. Grammar now includes TIME_LITERAL and separates it in expressions ---
st_grammar = r"""
    ?start: statement+

    ?statement: if_statement | assignment | fb_call ";"

    if_statement: "IF" condition "THEN" body (elsif_block)* (else_block)? "END_IF" ";"
    elsif_block: "ELSIF" condition "THEN" body
    else_block: "ELSE" body
    body: statement+

    ?condition: or_expr
    or_expr: and_expr (OR and_expr)*
    and_expr: not_expr (AND not_expr)*
    not_expr: "NOT" not_expr | comparison | atom

    comparison: variable COMPARISON expr
    ?atom: variable | "(" condition ")"

    assignment: variable ":=" condition ";"
    ?expr: variable | literal
    
    literal: BOOLEAN | SIGNED_NUMBER | TIME_LITERAL
    variable: CNAME ("." CNAME)*

    fb_call: CNAME "(" [param_assign ("," param_assign)*] ")"
    param_assign: CNAME ":=" expr

    BOOLEAN: "TRUE" | "FALSE"
    TIME_LITERAL: /(T|t)#[^\s;,)]+/
    OR: "OR"
    AND: "AND" | "&"
    COMPARISON: ">" | "<" | ">=" | "<=" | "=" | "<>"

    %import common.CNAME
    %import common.SIGNED_NUMBER
    %import common.WS
    %ignore WS
"""

# --- 2. Transformer handles new literal types ---
@v_args(inline=True)
class STtoIR(Transformer):
    def start(self, *items): return {"type": "program", "statements": list(items)}
    def statement(self, item): return item
    def body(self, *statements): return list(statements)

    def if_statement(self, if_cond, if_body, *rest):
        elsif_blocks = [item for item in rest if item and item.get('type') == 'elsif']
        else_block = next((item for item in rest if item and item.get('type') == 'else'), None)
        if_block = {'type': 'if', 'condition': if_cond, 'body': if_body}
        all_blocks = [if_block] + elsif_blocks
        if else_block: all_blocks.append(else_block)
        return {'type': 'if_chain', 'blocks': all_blocks}

    def elsif_block(self, cond, body): return {'type': 'elsif', 'condition': cond, 'body': body}
    def else_block(self, body): return {'type': 'else', 'body': body}
    def or_expr(self, left, *rights): return {'type': 'op', 'op': 'OR', 'operands': [left] + list(rights)} if rights else left
    def and_expr(self, left, *rights): return {'type': 'op', 'op': 'AND', 'operands': [left] + list(rights)} if rights else left
    def not_expr(self, operand): return {'type': 'op', 'op': 'NOT', 'operands': [operand]}
    def comparison(self, var, op, value): return {'type': 'comp', 'op': str(op), 'operands': [var, value]}
    def assignment(self, var, value): return {'type': 'assign', 'variable': var, 'value': value}
    def variable(self, *parts): return {'type': 'var', 'name': ".".join(str(p) for p in parts)}

    def expr(self, value): return value
    
    def literal(self, value):
        # This will be a Token from one of the literal types
        val_str = str(value)
        if val_str in ['TRUE', 'FALSE']: return {'type': 'literal', 'dataType': 'BOOL', 'value': val_str}
        if val_str.upper().startswith('T#'): return {'type': 'literal', 'dataType': 'TIME', 'value': val_str}
        return {'type': 'literal', 'dataType': 'DINT', 'value': val_str}


    def fb_call(self, name, *params): return {'type': 'fb_call', 'instance': str(name), 'params': list(params)}
    def param_assign(self, name, value): return {'name': str(name), 'value': value}

# --- Main Translation Function ---
parser = Lark(st_grammar, start='start', parser='lalr')
transformer = STtoIR()

def translate_st_to_ir(st_code: str):
    """Translates ST code to a structured Intermediate Representation (IR)."""
    if not st_code.strip():
        return {"type": "error", "message": "No code provided to parse."}
    try:
        parse_tree = parser.parse(st_code)
        return transformer.transform(parse_tree)
    except Exception as e:
        return {"type": "error", "message": str(e)}

