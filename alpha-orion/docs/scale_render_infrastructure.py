import sys
import re
import argparse

def scale_infrastructure(target_plan):
    print(f"🚀 Scaling Alpha-Orion Infrastructure to '{target_plan.upper()}' tier...")
    
    render_yaml_path = 'render.yaml'
    
    try:
        with open(render_yaml_path, 'r') as f:
            content = f.read()
        
        # Regex to find 'plan: <value>'
        # We want to replace 'plan: starter' or 'plan: free' with the target plan
        # Render plans: free, starter, standard, pro, pro_plus, etc.
        
        # Count occurrences before replacement
        count = len(re.findall(r'plan:\s+\w+', content))
        
        # Perform replacement
        new_content = re.sub(r'plan:\s+\w+', f'plan: {target_plan}', content)
        
        if content == new_content:
            print(f"⚠️  No changes made. Infrastructure might already be on '{target_plan}'.")
        else:
            with open(render_yaml_path, 'w') as f:
                f.write(new_content)
            print(f"✅ Successfully updated {count} services to use '{target_plan}' plan.")
            print("   - user-api-service")
            print("   - live-metrics-server")
            print("   - blockchain-monitor")
            print("   - databases (Postgres & Redis)")
            
            print("\n⚠️  Action Required: Commit and push 'render.yaml' to trigger the upgrade.")
            print("   git add render.yaml")
            print(f"   git commit -m 'chore: scale infrastructure to {target_plan}'")
            print("   git push origin main")

    except FileNotFoundError:
        print(f"❌ Error: {render_yaml_path} not found in current directory.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Scale Render Infrastructure Plans')
    parser.add_argument('--plan', type=str, choices=['free', 'starter', 'standard', 'pro'], 
                        default='starter', help='Target Render plan (default: starter)')
    
    args = parser.parse_args()
    
    scale_infrastructure(args.plan)