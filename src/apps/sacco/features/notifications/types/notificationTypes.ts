export type NotificationType = 'transaction' | 'loan' | 'security' | 'announcement';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
};

