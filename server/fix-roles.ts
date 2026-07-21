import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.teamMember.findMany();
  for (const member of members) {
    await prisma.teamMember.update({
      where: { id: member.id },
      data: { role: '管理員' }
    });
  }
  console.log("Fixed roles to 管理員 for all members.");
}
main();
