import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({ include: { members: true } });
  for (const team of teams) {
    let adminRole = await prisma.teamRole.findFirst({ where: { teamId: team.id, name: '管理員' } });
    if (!adminRole) {
      adminRole = await prisma.teamRole.create({
        data: { name: '管理員', canEdit: true, canInvite: true, teamId: team.id }
      });
      await prisma.teamRole.create({
        data: { name: '來賓', canEdit: false, canInvite: false, teamId: team.id }
      });
    }

    for (const member of team.members) {
      if (!member.roleId) {
        let role = adminRole;
        if (member.role !== '管理員') {
          // If they had a different legacy role, we just map it to a new custom role
          let legacyRole = await prisma.teamRole.findFirst({ where: { teamId: team.id, name: member.role } });
          if (!legacyRole) {
            legacyRole = await prisma.teamRole.create({
              data: { name: member.role, canEdit: true, canInvite: false, teamId: team.id }
            });
          }
          role = legacyRole;
        }
        await prisma.teamMember.update({
          where: { id: member.id },
          data: { roleId: role.id, role: role.name }
        });
      }
    }
  }
  console.log("Migration complete!");
}
main();
