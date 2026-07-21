import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, id: true } });
  console.log("Users:", users);
  
  const teams = await prisma.team.findMany();
  console.log("Teams:", teams);
  
  const members = await prisma.teamMember.findMany();
  console.log("Members:", members);
}
main();
