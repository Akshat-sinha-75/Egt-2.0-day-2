import random
import string
import json
import itertools

random.seed(42)  # Reproducible

# Generate 50 unique passwords - mix of words + numbers, not predictable
word_pool = [
    'LUMOS', 'EXPECTO', 'FELIX', 'NIMBUS', 'ACCIO', 'ALOHOMORA', 'OBLIVIATE',
    'PATRONUS', 'SECTUMSEMPRA', 'SERPENSORTIA', 'STUPEFY', 'PROTEGO',
    'RIDDIKULUS', 'LEVIOSA', 'INCENDIO', 'CRUCIO', 'IMPERIO', 'MORSMORDRE',
    'REPARO', 'NARGLES', 'EXPELLIARMUS', 'AVADA', 'FIDELIUS', 'VERITASERUM',
    'MANDRAKE', 'BASILISK', 'THESTRAL', 'HIPPOGRIFF', 'CENTAUR', 'GRINDYLOW',
    'DEMENTOR', 'BOGGART', 'KELPIE', 'INFERIUS', 'ERUMPENT', 'NIFFLER',
    'BOWTRUCKLE', 'OCCAMY', 'ZOUWU', 'ASHWINDER', 'DIRICAWL', 'FWOOPER',
    'JOBBERKNOLL', 'MOONCALF', 'PLIMPY', 'PUFFSKEIN', 'RAMORA', 'SNIDGET',
    'STREELER', 'AUGUREY'
]

passwords = []
used = set()
for i in range(50):
    while True:
        w = random.choice(word_pool)
        n = random.randint(10, 99)
        s = random.choice(['!', '@', '#', '$', '&', '*'])
        pwd = f"{w}{n}{s}"
        if pwd not in used:
            used.add(pwd)
            passwords.append(pwd)
            break

# Generate paths - 25 unique permutations, each used by ~2 teams
dests = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6']
all_perms = list(itertools.permutations(dests))
random.shuffle(all_perms)
unique_paths = all_perms[:25]

# Assign 50 teams to 25 paths (2 teams per path)
path_assignments = []
for i in range(50):
    path_assignments.append(unique_paths[i % 25])

# Shuffle the assignment so it's not just teams 1&26 sharing, etc.
random.shuffle(path_assignments)

# --- Generate db.js update ---
print("=== PASSWORDS FOR REFERENCE ===")
for i in range(50):
    tid = f"TH-{str(i+1).zfill(3)}"
    print(f"{tid}: {passwords[i]}")

# --- Generate SQL for paths and assignments ---
sql_lines = []
sql_lines.append("-- Round 2: Paths and Team Assignments")
sql_lines.append("-- Run this AFTER round2_schema.sql and update_qs.sql")
sql_lines.append("")

# Insert paths
sql_lines.append("-- Delete old paths and assignments")
sql_lines.append("DELETE FROM round2_progress;")
sql_lines.append("DELETE FROM round2_team_assignments;")
sql_lines.append("DELETE FROM round2_paths;")
sql_lines.append("")

for idx, p in enumerate(unique_paths):
    pid = f"PATH_{str(idx+1).zfill(2)}"
    checkpoints = json.dumps(list(p))
    sql_lines.append(f"INSERT INTO round2_paths (id, checkpoints) VALUES ('{pid}', '{checkpoints}') ON CONFLICT (id) DO UPDATE SET checkpoints = EXCLUDED.checkpoints;")

sql_lines.append("")
sql_lines.append("-- Assign teams to paths")

for i in range(50):
    tid = f"TH-{str(i+1).zfill(3)}"
    path_idx = None
    for idx, p in enumerate(unique_paths):
        if list(p) == list(path_assignments[i]):
            path_idx = idx
            break
    pid = f"PATH_{str(path_idx+1).zfill(2)}"
    sql_lines.append(f"INSERT INTO round2_team_assignments (team_id, path_id, current_step, state) VALUES ('{tid}', '{pid}', 0, 'PENDING_SOLVE') ON CONFLICT (team_id) DO UPDATE SET path_id = EXCLUDED.path_id, current_step = 0, state = 'PENDING_SOLVE', current_question_id = NULL;")

with open('round2_teams.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines) + '\n')

# --- Generate password list for db.js ---
with open('team_passwords.json', 'w', encoding='utf-8') as f:
    data = []
    for i in range(50):
        data.append({"teamId": f"TH-{str(i+1).zfill(3)}", "pass": passwords[i]})
    json.dump(data, f, indent=2)

print("\n=== FILES GENERATED ===")
print("round2_teams.sql - Run in Supabase for paths & assignments")
print("team_passwords.json - Reference for updating db.js")
