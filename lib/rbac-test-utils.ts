/**
 * RBAC Testing Utilities
 * Use this to test role matching with different backend formats
 */

import { rbacService } from "@/lib/rbac-service";
import { ROLES } from "@/lib/rbac-constants";
import { UserData } from "@/lib/token-service";

/**
 * Test role matching with different backend formats
 */
export function testRoleMatching() {
  console.group("🔐 RBAC Role Matching Tests");

  // Test different backend role formats
  const testCases = [
    {
      description: "Backend sends SUPER_ADMIN (uppercase snake_case)",
      user: { email: "test@example.com", roles: ["SUPER_ADMIN"] } as UserData,
      expectedRole: ROLES.SUPER_ADMIN,
    },
    {
      description: "Backend sends super_admin (lowercase snake_case)",
      user: { email: "test@example.com", roles: ["super_admin"] } as UserData,
      expectedRole: ROLES.SUPER_ADMIN,
    },
    {
      description: "Backend sends SuperAdmin (PascalCase)",
      user: { email: "test@example.com", roles: ["SuperAdmin"] } as UserData,
      expectedRole: ROLES.SUPER_ADMIN,
    },
    {
      description: "Backend sends superAdmin (camelCase)",
      user: { email: "test@example.com", roles: ["superAdmin"] } as UserData,
      expectedRole: ROLES.SUPER_ADMIN,
    },
    {
      description: "Backend sends ADMIN",
      user: { email: "test@example.com", roles: ["ADMIN"] } as UserData,
      expectedRole: ROLES.ADMIN,
    },
    {
      description: "Backend sends admin (lowercase)",
      user: { email: "test@example.com", roles: ["admin"] } as UserData,
      expectedRole: ROLES.ADMIN,
    },
    {
      description: "Multiple roles including super_admin",
      user: {
        email: "test@example.com",
        roles: ["employee", "super_admin"],
      } as UserData,
      expectedRole: ROLES.SUPER_ADMIN,
    },
  ];

  testCases.forEach((testCase) => {
    const result = rbacService.hasRole(testCase.user, testCase.expectedRole);
    console.log(`\n${testCase.description}`);
    console.log(`  User roles:`, testCase.user.roles);
    console.log(`  Expected role:`, testCase.expectedRole);
    console.log(`  Result: ${result ? "✅ PASS" : "❌ FAIL"}`);
  });

  console.groupEnd();
}

/**
 * Log user authorization status for debugging
 */
export function debugUserAuthorization(user: UserData | null) {
  console.group("🔐 User Authorization Debug");
  console.log("User:", user?.email || "Not logged in");
  console.log("Roles:", user?.roles || []);
  console.log("Permissions:", user?.permissions || []);

  if (user?.roles) {
    console.log("\nRole Checks:");
    console.log(
      `  - Is Employee: ${rbacService.hasRole(user, ROLES.EMPLOYEE)}`
    );
    console.log(`  - Is Manager: ${rbacService.hasRole(user, ROLES.MANAGER)}`);
    console.log(`  - Is Admin: ${rbacService.hasRole(user, ROLES.ADMIN)}`);
    console.log(
      `  - Is Super Admin: ${rbacService.hasRole(user, ROLES.SUPER_ADMIN)}`
    );

    console.log("\nHierarchy Checks:");
    console.log(
      `  - Has minimum Employee: ${rbacService.hasMinimumRole(user, ROLES.EMPLOYEE)}`
    );
    console.log(
      `  - Has minimum Manager: ${rbacService.hasMinimumRole(user, ROLES.MANAGER)}`
    );
    console.log(
      `  - Has minimum Admin: ${rbacService.hasMinimumRole(user, ROLES.ADMIN)}`
    );
  }

  console.groupEnd();
}
