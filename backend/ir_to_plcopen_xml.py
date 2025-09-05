import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime
import uuid

# --- Helper to find all variables for declaration ---
def find_all_variables(ir_program):
    """Traverses the IR and returns a set of all unique variable names."""
    variables = set()
    
    def recursive_find(node):
        if isinstance(node, dict):
            node_type = node.get('type')
            if node_type == 'var': variables.add(node.get('name'))
            if node_type == 'assign':
                if node.get('variable', {}).get('type') == 'var':
                    variables.add(node['variable']['name'])
            if node_type == 'fb_call':
                variables.add(node.get('instance'))
                for param in node.get('params', []):
                    if param.get('value', {}).get('type') == 'var':
                        variables.add(param['value']['name'])

            for value in node.values(): recursive_find(value)
        elif isinstance(node, list):
            for item in node: recursive_find(item)

    recursive_find(ir_program)
    return sorted(list(variables))


# --- New, More Powerful Ladder Body Builder ---
class LadderBuilder:
    def __init__(self, ld_parent_element):
        self.ld = ld_parent_element
        self.local_id_counter = 0

    def get_id(self):
        self.local_id_counter += 1
        return str(self.local_id_counter)

    def add_element(self, tag, parent_id, negated="false", variable="", type_name="", instance_name=""):
        el_id = self.get_id()
        attrs = {'localId': el_id}
        if tag in ['contact', 'coil']: attrs['negated'] = negated
        if type_name: attrs['typeName'] = type_name
        if instance_name: attrs['instanceName'] = instance_name
            
        element = ET.SubElement(self.ld, tag, **attrs)
        ET.SubElement(element, 'position', x="0", y="0")
        
        conn_in = ET.SubElement(element, 'connectionPointIn')
        if isinstance(parent_id, list): # For merging OR branches
            for pid in parent_id:
                conn_in.append(ET.Element('connection', refLocalId=str(pid)))
        else:
            conn_in.append(ET.Element('connection', refLocalId=str(parent_id)))
            
        ET.SubElement(element, 'connectionPointOut')
        if variable:
            ET.SubElement(element, 'variable').text = variable
        return el_id

    def build_condition(self, parent_id, cond_ir):
        """Recursively builds XML for any condition and returns the last element's ID."""
        node_type = cond_ir.get('type')
        
        if node_type == 'var':
            return self.add_element('contact', parent_id, variable=cond_ir['name'])
        
        if node_type == 'op':
            op = cond_ir.get('op')
            operands = cond_ir.get('operands', [])
            
            if op == 'AND':
                last_id = parent_id
                for operand in operands: last_id = self.build_condition(last_id, operand)
                return last_id
            
            if op == 'NOT':
                return self.add_element('contact', parent_id, negated="true", variable=operands[0]['name'])

            if op == 'OR':
                return [self.build_condition(parent_id, op) for op in operands]

        return parent_id # Fallback

    def build_action(self, parent_id, action_ir):
        if action_ir.get('type') == 'assign':
            self.add_element('coil', parent_id, variable=action_ir['variable']['name'])
        elif action_ir.get('type') == 'fb_call':
            self.build_fb_call(parent_id, action_ir)
            
    def build_fb_call(self, parent_id, fb_ir):
        block_id = self.get_id()
        block_type = fb_ir['instance'].split('_')[0]
        block = ET.SubElement(self.ld, 'block', localId=block_id, typeName=block_type, instanceName=fb_ir['instance'])
        ET.SubElement(block, 'position', x="0", y="0")
        
        input_vars = ET.SubElement(block, 'inputVariables')
        for param in fb_ir.get('params', []):
            param_name = param.get('name', '').upper()
            param_value = param.get('value', {})
            
            var_el = ET.SubElement(input_vars, 'variable', formalParameter=param_name)
            if param_value.get('type') == 'var':
                var_el.append(ET.Element('connection', refLocalId=str(parent_id)))
            elif param_value.get('type') == 'literal':
                ET.SubElement(var_el, 'simpleValue', value=param_value['value'])

        ET.SubElement(block, 'outputVariables')
        return block_id

    def build(self, ir_program):
        """Constructs the entire ladder diagram body from the program IR."""
        left_rail_id = self.get_id()
        left_rail = ET.SubElement(self.ld, 'leftPowerRail', localId=left_rail_id)
        ET.SubElement(left_rail, 'position', x="0", y="0")
        ET.SubElement(left_rail, 'connectionPointOut', formalParameter="none")

        for stmt in ir_program.get('statements', []):
            if stmt.get('type') == 'assign':
                last_cond_id = self.build_condition(left_rail_id, stmt['value'])
                self.build_action(last_cond_id, stmt)
            elif stmt.get('type') == 'fb_call':
                 in_param = next((p for p in stmt.get('params', []) if p.get('name', '').upper() == 'IN'), None)
                 if in_param:
                    last_cond_id = self.build_condition(left_rail_id, in_param['value'])
                    self.build_action(last_cond_id, stmt)

        right_rail_id = self.get_id()
        right_rail = ET.SubElement(self.ld, 'rightPowerRail', localId=right_rail_id)
        ET.SubElement(right_rail, 'position', x="0", y="0")

# --- Main Translation Function ---
def translate_ir_to_xml(ir_program, project_name="GeneratedProject"):
    ns = "http://www.plcopen.org/xml/tc6_0200"
    ET.register_namespace('', ns)
    project = ET.Element('project', xmlns=ns)
    
    # Headers and static project parts...
    ET.SubElement(project, 'fileHeader', companyName="NL to ST", productName="Auto-Gen", productVersion="1.0", creationDateTime=datetime.utcnow().isoformat())
    content_header = ET.SubElement(project, 'contentHeader', name=project_name)
    coord_info = ET.SubElement(content_header, 'coordinateInfo')
    ET.SubElement(ET.SubElement(coord_info, 'ld'), 'scaling', x="1", y="1")
    types = ET.SubElement(project, 'types')
    ET.SubElement(types, 'dataTypes')
    pous = ET.SubElement(types, 'pous')
    pou_name = "GeneratedPOU"
    pou_uuid = str(uuid.uuid4())
    pou = ET.SubElement(pous, 'pou', name=pou_name, pouType="program")
    
    interface = ET.SubElement(pou, 'interface')
    local_vars = ET.SubElement(interface, 'localVars')
    all_vars = find_all_variables(ir_program)
    for var_name in all_vars:
        var_el = ET.SubElement(local_vars, 'variable', name=var_name)
        type_el = ET.SubElement(var_el, 'type')
        var_type = 'BOOL' # Default
        if any(t in var_name.upper() for t in ['TON', 'TOF', 'TIMER']):
            var_type = 'TON' # Smarter type detection
        ET.SubElement(type_el, var_type)
        
    body = ET.SubElement(pou, 'body')
    ld = ET.SubElement(body, 'LD')
    builder = LadderBuilder(ld)
    builder.build(ir_program)
    
    # Metadata and closing tags...
    pou_add_data = ET.SubElement(pou, 'addData')
    data_obj_id = ET.SubElement(pou_add_data, 'data', name="http://www.3s-software.com/plcopenxml/objectid", handleUnknown="discard")
    ET.SubElement(data_obj_id, 'ObjectId').text = pou_uuid
    instances = ET.SubElement(project, 'instances')
    ET.SubElement(instances, 'configurations')
    project_add_data = ET.SubElement(project, 'addData')
    data_proj_struct = ET.SubElement(project_add_data, 'data', name="http://www.3s-software.com/plcopenxml/projectstructure", handleUnknown="discard")
    ET.SubElement(ET.SubElement(data_proj_struct, 'ProjectStructure'), 'Object', Name=pou_name, ObjectId=pou_uuid)

    xml_str = ET.tostring(project, 'utf-8')
    return minidom.parseString(xml_str).toprettyxml(indent="  ")

