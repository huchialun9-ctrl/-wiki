import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) { console.log("No user"); return; }
    
    const team = await prisma.team.findFirst({ where: { ownerId: user.id } });
    if (!team) { console.log("No team"); return; }
    
    console.log("Team:", team.id, "User:", user.id);
    
    const requester = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: user.id } }
    });
    console.log("Requester:", requester);
  } catch (err) {
    console.error(err);
  }
}
main();
