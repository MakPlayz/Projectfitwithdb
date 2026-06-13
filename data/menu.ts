export interface AddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isHighProtein: boolean;
  calories: number;
  protein: number;
  carbs: number;
  ingredients: string[];
  addOns: AddOn[];
  badge?: string;
}

export const menuData: MenuItem[] = [];

export const categories = ['All'];
