import re
import json

lines = open('questions.txt', encoding='utf-8').read().split('\n')
ans_lines = open('questions.txt', encoding='utf-8').read().split('ANSWER KEY')[1].split('\n')
answers = {}
for i in range(len(ans_lines)):
    if ans_lines[i].strip().isdigit() and i+2 < len(ans_lines) and ans_lines[i+2].strip().isdigit():
        answers[int(ans_lines[i].strip())] = ans_lines[i+2].strip()

questions = []
current_q = None
text = []
for line in lines:
    if line.startswith('ANSWER KEY'): break
    # Look for number followed by a dot, space, and an emoji or letter
    m = re.match(r'^(\d+)\.\s+[^\w\s]', line) 
    if not m:
        m = re.match(r'^(\d+)\.\s+[A-Z]', line)
    
    # We know the first line of a question in this doc starts with the number and title.
    if m and ('The' in line or 'Snape' in line):
        if current_q: questions.append({'id': current_q, 'text': '\n'.join(text)})
        current_q = int(m.group(1))
        text = [line]
    elif current_q:
        text.append(line)
if current_q: questions.append({'id': current_q, 'text': '\n'.join(text)})

# Drop question type 6 (ids divisible by 6)
filtered_qs = [q for q in questions if q['id'] % 6 != 0]

dests = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6']
sql = 'DELETE FROM round2_questions;\n'
# assign 1 variant of each of the 5 types to each of the 6 destinations
for q in filtered_qs:
    q_id = q['id']
    variant = (q_id - 1) // 6 # 0 to 5
    dest = dests[variant]
    # Strip metadata lines: title line, Difficulty:, Concept:, and any blank lines at the start
    raw_lines = q['text'].split('\n')
    body_lines = []
    skip = True
    for ln in raw_lines:
        stripped = ln.strip()
        if skip:
            # Skip the title line (starts with number.), Difficulty:, Concept:, and blanks
            if re.match(r'^\d+\.', stripped) or stripped.startswith('Difficulty:') or stripped.startswith('Concept:') or stripped == '':
                continue
            else:
                skip = False
        body_lines.append(ln)
    q_text = '\n'.join(body_lines).strip().replace("'", "''")
    ans = answers.get(q_id, '')
    dif_type = (q_id - 1) % 6 # 0 is Easy
    difficulty = 'EASY' if dif_type == 0 else 'OTHER'
    sql += f"INSERT INTO round2_questions (destination_id, question_text, correct_answer, difficulty) VALUES ('{dest}', '{q_text}', '{ans}', '{difficulty}');\n"

open('update_qs.sql', 'w', encoding='utf-8').write(sql)
print('ok')
