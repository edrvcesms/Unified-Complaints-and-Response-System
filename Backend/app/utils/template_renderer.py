from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("app/templates"))

def render_template(template_path: str, context: dict):
    template = env.get_template(template_path)
    return template.render(**context)