import {
  memberChangePasswordRequestSchema,
  memberLoginRequestSchema,
  memberLoginResponseSchema,
  memberPinSchema,
  persistedMemberAuthSessionSchema,
} from '../schemas/memberAuthSchemas';
import { persistedAuthSessionSchema } from '../schemas/authSchemas';

describe('memberAuthSchemas', () => {
  describe('memberPinSchema', () => {
    it('accepts 4 and 5 digit numeric PINs', () => {
      expect(memberPinSchema.safeParse('1234').success).toBe(true);
      expect(memberPinSchema.safeParse('12345').success).toBe(true);
    });

    it('rejects invalid PIN formats', () => {
      expect(memberPinSchema.safeParse('123').success).toBe(false); // too short
      expect(memberPinSchema.safeParse('123456').success).toBe(false); // too long
      expect(memberPinSchema.safeParse('abcd').success).toBe(false); // non-numeric
      expect(memberPinSchema.safeParse('12a4').success).toBe(false);
    });
  });

  describe('memberLoginRequestSchema', () => {
    it('validates correct member login credentials', () => {
      const payload = {
        org: 'kagera-sacco',
        member_no: 'M-1029',
        password: '4567',
      };
      const result = memberLoginRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('fails when org or member_no is empty', () => {
      expect(
        memberLoginRequestSchema.safeParse({
          org: '',
          member_no: 'M-100',
          password: '1234',
        }).success,
      ).toBe(false);

      expect(
        memberLoginRequestSchema.safeParse({
          org: 'sacco',
          member_no: '',
          password: '1234',
        }).success,
      ).toBe(false);
    });
  });

  describe('memberLoginResponseSchema', () => {
    it('validates a complete member login response', () => {
      const response = {
        session: {
          access_token: 'bmm_live_access_123',
          refresh_token: 'bmm_refresh_abc',
          expires_in: 900,
        },
        must_change_password: false,
        member: {
          id: 'mem_1',
          name: 'Sarah Nakato',
          member_no: 'M-1029',
          phone: '+256772123456',
        },
        organization: {
          id: 'org_1',
          name: 'Kagera Farmers SACCO',
          slug: 'kagera-sacco',
        },
      };

      const result = memberLoginResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('memberChangePasswordRequestSchema', () => {
    it('validates next PIN with or without current PIN', () => {
      expect(
        memberChangePasswordRequestSchema.safeParse({
          next: '9876',
        }).success,
      ).toBe(true);

      expect(
        memberChangePasswordRequestSchema.safeParse({
          current: '1234',
          next: '98765',
        }).success,
      ).toBe(true);
    });
  });

  describe('persistedAuthSessionSchema backwards compatibility', () => {
    it('parses legacy staff sessions and new member sessions without error', () => {
      const legacyPayload = {
        session: {
          access_token: 'staff_tok',
          refresh_token: 'staff_ref',
        },
        user: { id: 'u1', email: 'test@baigamats.com' },
        profile: { role: 'admin' },
      };

      const parsedLegacy = persistedAuthSessionSchema.safeParse(legacyPayload);
      expect(parsedLegacy.success).toBe(true);
      if (parsedLegacy.success) {
        expect(parsedLegacy.data.authType).toBe('staff');
      }

      const memberPayload = {
        authType: 'member',
        session: {
          access_token: 'bmm_123',
          refresh_token: 'bmm_ref',
        },
        member: {
          name: 'Sarah',
          member_no: 'M-1',
          phone: '077000000',
        },
        organization: {
          name: 'SACCO 1',
        },
        mustChangePassword: true,
      };

      const parsedMember = persistedAuthSessionSchema.safeParse(memberPayload);
      expect(parsedMember.success).toBe(true);
      if (parsedMember.success) {
        expect(parsedMember.data.authType).toBe('member');
        expect(parsedMember.data.mustChangePassword).toBe(true);
      }
    });
  });
});

