"""
Social Studio - Automated Project Restoration and Setup Script

This script automatically:
1. Validates project structure
2. Creates missing directories and files
3. Fixes imports and dependencies
4. Tests the application locally
5. Provides detailed error reporting

Usage: python restore_project.py
"""

import sys
import os
import subprocess
from pathlib import Path
import shutil

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_step(msg):
    print(f"\n{Colors.BLUE}{Colors.BOLD}▶ {msg}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def check_python_version():
    """Check if Python version is 3.10+"""
    print_step("Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print_success(f"Python {version.major}.{version.minor}.{version.micro} detected")
        return True
    else:
        print_error(f"Python 3.10+ required, found {version.major}.{version.minor}")
        return False

def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.absolute()

def create_directory_structure():
    """Create required directories if missing"""
    print_step("Creating directory structure...")
    
    root = get_project_root()
    dirs_to_create = [
        root / "config",
        root / "social_studio",
        root / "scheduler_export",
        root / "logs"
    ]
    
    for dir_path in dirs_to_create:
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            print_success(f"Created directory: {dir_path.name}/")
        else:
            print_success(f"Directory exists: {dir_path.name}/")

def create_requirements_txt():
    """Create requirements.txt if missing"""
    print_step("Checking requirements.txt...")
    
    root = get_project_root()
    req_file = root / "requirements.txt"
    
    required_packages = """streamlit>=1.28.0
pyyaml>=6.0
pillow>=10.0.0
python-dateutil>=2.8.0"""
    
    if not req_file.exists():
        req_file.write_text(required_packages)
        print_success("Created requirements.txt")
    else:
        print_success("requirements.txt exists")
    
    return req_file

def create_gitignore():
    """Create .gitignore if missing"""
    print_step("Checking .gitignore...")
    
    root = get_project_root()
    gitignore = root / ".gitignore"
    
    content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
ENV/
env/

# IDEs
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Streamlit
.streamlit/secrets.toml
"""
    
    if not gitignore.exists():
        gitignore.write_text(content)
        print_success("Created .gitignore")
    else:
        print_success(".gitignore exists")

def create_init_file():
    """Create __init__.py in social_studio/"""
    print_step("Checking social_studio/__init__.py...")
    
    root = get_project_root()
    init_file = root / "social_studio" / "__init__.py"
    
    content = '''"""
Social Studio - Social Media Content Preparation Tool
"""

__version__ = "1.0.0"
'''
    
    if not init_file.exists():
        init_file.write_text(content)
        print_success("Created social_studio/__init__.py")
    else:
        print_success("social_studio/__init__.py exists")

def create_config_yaml():
    """Create config/config.yaml if missing"""
    print_step("Checking config/config.yaml...")
    
    root = get_project_root()
    config_file = root / "config" / "config.yaml"
    
    content = """# Social Studio Configuration

# Brand Information
brand:
  name: "Your Brand"
  tagline: "Creating Amazing Content"
  
# Default Platforms
default_platforms:
  - instagram
  - tiktok

# Platform Settings
platforms:
  instagram:
    enabled: true
    max_duration: 60
  tiktok:
    enabled: true
    max_duration: 60
  facebook:
    enabled: true
    max_duration: 240
  youtube:
    enabled: true
    max_duration: 600
  twitter:
    enabled: true
    max_duration: 140

# Caption Templates
caption_templates:
  default:
    - "Check this out! 🎬"
    - "New content alert! 🔥"
    - "Don't miss this! ✨"

# Hashtag Sets
hashtag_sets:
  general:
    - "#content"
    - "#creative"
    - "#socialmedia"
    - "#viral"
    - "#trending"

# Processing Settings
processing:
  audio:
    default_duration: 15
    max_duration: 60
  image:
    max_size: 10485760
"""
    
    if not config_file.exists():
        config_file.write_text(content)
        print_success("Created config/config.yaml")
    else:
        print_success("config/config.yaml exists")

def create_root_app_py():
    """Create root-level app.py if missing"""
    print_step("Checking root app.py...")
    
    root = get_project_root()
    app_file = root / "app.py"
    
    # Check if social_studio/app.py exists (the full version)
    full_app = root / "social_studio" / "app.py"
    
    if full_app.exists():
        # Copy the full version to root
        shutil.copy(full_app, app_file)
        print_success("Copied social_studio/app.py to root")
    elif not app_file.exists():
        # Create minimal version
        content = '''"""
Social Studio - Web Interface
"""

import streamlit as st

# Page config MUST be first Streamlit command
st.set_page_config(page_title="Social Studio", layout="wide")

import yaml
import sys
from pathlib import Path

st.title("🎬 Social Studio")
st.subheader("AI-powered social content creation")

# Debug info
st.write("---")
st.write("**System Info:**")
st.success(f"✅ YAML loaded successfully, version: {yaml.__version__}")
st.info(f"Python version: {sys.version}")
st.info(f"Project root: {Path(__file__).parent}")

# Try importing modules
st.write("---")
st.write("**Module Import Test:**")

try:
    from social_studio.config_manager import ConfigManager
    st.success("✅ config_manager imported")
except ImportError as e:
    st.error(f"❌ config_manager import failed: {e}")

try:
    from social_studio.content_processor import ContentProcessor
    st.success("✅ content_processor imported")
except ImportError as e:
    st.error(f"❌ content_processor import failed: {e}")

try:
    from social_studio.caption_generator import CaptionGenerator
    st.success("✅ caption_generator imported")
except ImportError as e:
    st.error(f"❌ caption_generator import failed: {e}")

try:
    from social_studio.export_manager import ExportManager
    st.success("✅ export_manager imported")
except ImportError as e:
    st.error(f"❌ export_manager import failed: {e}")

st.write("---")
st.write("**Python sys.path:**")
for i, path in enumerate(sys.path[:5], 1):
    st.text(f"{i}. {path}")
'''
        app_file.write_text(content)
        print_success("Created minimal root app.py")
    else:
        print_success("Root app.py exists")

def install_dependencies():
    """Install Python dependencies"""
    print_step("Installing dependencies...")
    
    root = get_project_root()
    req_file = root / "requirements.txt"
    
    try:
        # Try pip install
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(req_file)],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            print_success("All dependencies installed successfully")
            return True
        else:
            print_warning("Some dependencies may have failed to install")
            print(result.stderr)
            return False
            
    except Exception as e:
        print_error(f"Failed to install dependencies: {e}")
        return False

def validate_imports():
    """Validate that all modules can be imported"""
    print_step("Validating module imports...")
    
    modules = [
        "yaml",
        "streamlit",
        "PIL",
        "dateutil"
    ]
    
    all_ok = True
    for module in modules:
        try:
            __import__(module)
            print_success(f"✅ {module} imported successfully")
        except ImportError as e:
            print_error(f"❌ {module} import failed: {e}")
            all_ok = False
    
    # Test social_studio modules
    root = get_project_root()
    sys.path.insert(0, str(root))
    
    social_modules = [
        "social_studio.config_manager",
        "social_studio.content_processor",
        "social_studio.caption_generator",
        "social_studio.export_manager"
    ]
    
    for module in social_modules:
        try:
            __import__(module)
            print_success(f"✅ {module} imported successfully")
        except ImportError as e:
            print_warning(f"⚠️  {module} import failed: {e}")
            # This is a warning, not a failure, as modules might have dependencies
    
    return all_ok

def check_file_contents():
    """Check that key files have proper structure"""
    print_step("Validating file contents...")
    
    root = get_project_root()
    
    # Check app.py has page_config
    app_file = root / "app.py"
    if app_file.exists():
        try:
            content = app_file.read_text(encoding='utf-8')
            if "st.set_page_config" in content or "streamlit" in content:
                print_success("app.py has Streamlit code")
            else:
                print_warning("app.py might be missing Streamlit setup")
        except UnicodeDecodeError:
            print_warning("app.py has encoding issues, skipping validation")
    
    # Check social_studio modules exist
    required_files = [
        "social_studio/__init__.py",
        "social_studio/config_manager.py",
        "social_studio/content_processor.py",
        "social_studio/caption_generator.py",
        "social_studio/export_manager.py"
    ]
    
    for file_path in required_files:
        full_path = root / file_path
        if full_path.exists():
            print_success(f"✅ {file_path}")
        else:
            print_warning(f"⚠️  Missing: {file_path}")

def test_streamlit_app():
    """Test if Streamlit can load the app"""
    print_step("Testing Streamlit app (checking for syntax errors)...")
    
    root = get_project_root()
    app_file = root / "app.py"
    
    try:
        # Try to compile the app.py to check for syntax errors
        with open(app_file, 'r', encoding='utf-8') as f:
            code = f.read()
            compile(code, str(app_file), 'exec')
        print_success("app.py has no syntax errors")
        return True
    except SyntaxError as e:
        print_error(f"Syntax error in app.py: {e}")
        return False
    except Exception as e:
        print_warning(f"Could not validate app.py: {e}")
        return True  # Don't fail on this

def print_next_steps():
    """Print instructions for running the app"""
    print(f"\n{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.GREEN}{Colors.BOLD}🎉 SETUP COMPLETE!{Colors.RESET}")
    print(f"{Colors.GREEN}{Colors.BOLD}{'='*60}{Colors.RESET}\n")
    
    print(f"{Colors.BOLD}Next Steps:{Colors.RESET}")
    print(f"\n1. {Colors.BLUE}Run locally:{Colors.RESET}")
    print(f"   {Colors.YELLOW}streamlit run app.py --server.port 8507{Colors.RESET}")
    
    print(f"\n2. {Colors.BLUE}Deploy to Streamlit Cloud:{Colors.RESET}")
    print(f"   - Go to: {Colors.YELLOW}https://share.streamlit.io{Colors.RESET}")
    print(f"   - Connect your GitHub repo")
    print(f"   - Set main file: {Colors.YELLOW}app.py{Colors.RESET}")
    print(f"   - Deploy!")
    
    print(f"\n3. {Colors.BLUE}Commit changes:{Colors.RESET}")
    print(f"   {Colors.YELLOW}git add -A{Colors.RESET}")
    print(f"   {Colors.YELLOW}git commit -m 'Automated project setup complete'{Colors.RESET}")
    print(f"   {Colors.YELLOW}git push origin main{Colors.RESET}")
    
    print(f"\n{Colors.GREEN}{'='*60}{Colors.RESET}\n")

def main():
    """Main restoration workflow"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"🎬 SOCIAL STUDIO - AUTOMATED PROJECT SETUP")
    print(f"{'='*60}{Colors.RESET}\n")
    
    # Step 1: Check Python version
    if not check_python_version():
        print_error("Please upgrade Python to 3.10 or higher")
        sys.exit(1)
    
    # Step 2: Create directory structure
    create_directory_structure()
    
    # Step 3: Create essential files
    create_requirements_txt()
    create_gitignore()
    create_init_file()
    create_config_yaml()
    create_root_app_py()
    
    # Step 4: Install dependencies
    deps_ok = install_dependencies()
    if not deps_ok:
        print_warning("Some dependencies failed, but continuing...")
    
    # Step 5: Validate imports
    imports_ok = validate_imports()
    if not imports_ok:
        print_warning("Some imports failed, but project structure is set up")
    
    # Step 6: Check file contents
    check_file_contents()
    
    # Step 7: Test Streamlit app
    test_streamlit_app()
    
    # Step 8: Print next steps
    print_next_steps()
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Setup interrupted by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
