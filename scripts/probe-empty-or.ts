/**
 * Probe: does Prisma ignore an EMPTY `OR: []` in deleteMany/count?
 * The users route builds: OR: sentEscalations.map(e => ({linkData: {contains: e.id}}))
 * When the victim never sent an escalation this is OR: [] — if Prisma treats
 * that as "no condition", the delete wipes EVERY user's notifications.
 */
import { db } from "../src/lib/db";

async function main() {
  const total = await db.notification.count();
  const viaEmptyOr = await db.notification.count({ where: { OR: [] } });
  const viaEmptyAnd = await db.notification.count({ where: { AND: [] } });
  const viaEmptyNotOr = await db.notification.count({ where: { NOT: { OR: [] } } });
  console.log(`notifications total            : ${total}`);
  console.log(`count(where { OR: [] })        : ${viaEmptyOr}   ${viaEmptyOr === total ? "⚠️ EMPTY OR = ALL ROWS" : "empty OR matches nothing"}`);
  console.log(`count(where { AND: [] })       : ${viaEmptyAnd}   ${viaEmptyAnd === total ? "⚠️ EMPTY AND = ALL ROWS" : "empty AND matches nothing"}`);
  console.log(`count(where { NOT:{ OR: [] } }) : ${viaEmptyNotOr}`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("PROBE FAILED:", e);
    process.exit(1);
  });
