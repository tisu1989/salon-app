export interface ServiceItem {
  id: number;
  name: string;
  category: string | null;
  durationMinutes: number;
  price: string;
  isActive: boolean;
}
