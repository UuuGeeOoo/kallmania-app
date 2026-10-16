#!/bin/bash
# E2E: KPI Configuration — Inbound Call Centre (all optional, editable, deletable)
set -e
cd /home/z/my-project
BASE=http://localhost:3000
JAR=/tmp/kpi-admin.jar
rm -f "$JAR"

echo "== 1. admin login =="
curl -s -c "$JAR" -X POST "$BASE/api/auth" -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"echristian@kallmania.com","password":"@21279413"}' | head -c 120; echo

echo "== 2. GET kpi-config: departments present =="
curl -s -b "$JAR" "$BASE/api/kpi-config" | node -e "
let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{
  const { configs } = JSON.parse(s);
  const depts = [...new Set(configs.map(c=>c.department))];
  console.log('departments:', depts.join(', '));
  const inb = configs.filter(c=>c.department==='INBOUND');
  console.log('INBOUND count:', inb.length, '| any mandatory?', inb.some(c=>c.mandatory));
});"

echo "== 3. POST new INBOUND metric with mandatory=true (server must force optional) =="
curl -s -b "$JAR" -X POST "$BASE/api/kpi-config" -H 'Content-Type: application/json' \
  -d '{"department":"INBOUND","key":"abandonRate","label":"Abandoned Call Rate","unit":"percent","defaultTarget":5,"mandatory":true,"category":"CUSTOM"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {config}=JSON.parse(s);console.log('saved:',config.key,'| mandatory:',config.mandatory,'| category:',config.category);});"

echo "== 4. DELETE a formerly-protected key (totalCallsMade) from INBOUND =="
ID=$(curl -s -b "$JAR" "$BASE/api/kpi-config" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {configs}=JSON.parse(s);const c=configs.find(c=>c.department==='INBOUND'&&c.key==='totalCallsMade');console.log(c.id);});")
curl -s -b "$JAR" -X DELETE "$BASE/api/kpi-config?id=$ID" | head -c 60; echo
curl -s -b "$JAR" "$BASE/api/kpi-config" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {configs}=JSON.parse(s);console.log('INBOUND totalCallsMade still present?', configs.some(c=>c.department==='INBOUND'&&c.key==='totalCallsMade'));});"

echo "== 5. restore totalCallsMade for INBOUND =="
curl -s -b "$JAR" -X POST "$BASE/api/kpi-config" -H 'Content-Type: application/json' \
  -d '{"department":"INBOUND","key":"totalCallsMade","label":"Total Calls Made","unit":"count","defaultTarget":30,"mandatory":true,"category":"CORE_TEMPLATE"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {config}=JSON.parse(s);console.log('restored:',config.key,'| mandatory (forced false):',config.mandatory);});"

echo "== 6. BPO protection intact: mandatory stays true on outbound update =="
curl -s -b "$JAR" -X POST "$BASE/api/kpi-config" -H 'Content-Type: application/json' \
  -d '{"department":"BPO","key":"totalCallsMade","label":"Total Calls Made","unit":"count","defaultTarget":30,"mandatory":true,"category":"CORE_TEMPLATE"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {config}=JSON.parse(s);console.log('BPO totalCallsMade mandatory:',config.mandatory);});"

echo "== 7. cleanup test metric =="
ID2=$(curl -s -b "$JAR" "$BASE/api/kpi-config" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const {configs}=JSON.parse(s);const c=configs.find(c=>c.department==='INBOUND'&&c.key==='abandonRate');console.log(c?c.id:'');});")
if [ -n "$ID2" ]; then curl -s -b "$JAR" -X DELETE "$BASE/api/kpi-config?id=$ID2" > /dev/null; echo "abandonRate removed"; fi
echo "DONE"
