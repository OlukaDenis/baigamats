import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  MemberLogin: undefined;
  ChangePin: { isMandatory?: boolean } | undefined;
  MfaVerify: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Deposit: undefined;
  Transfer: { kind?: 'withdraw' | 'to_member' | 'to_shares' | 'to_welfare' } | undefined;
  Loans: undefined;
  Statement: undefined;
  Profile: undefined;
};

export type RootStackParamList = AuthStackParamList & MainTabParamList;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
