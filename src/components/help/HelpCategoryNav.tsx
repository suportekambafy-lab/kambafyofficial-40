import { Users, GraduationCap, CreditCard, Share2, UserPlus, HelpCircle } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'geral', label: 'Geral', icon: <HelpCircle className="w-5 h-5" /> },
  { id: 'coproducao', label: 'Co-produção', icon: <Users className="w-5 h-5" /> },
  { id: 'area-membros', label: 'Área de Membros', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'pagamentos', label: 'Pagamentos', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'afiliados', label: 'Afiliados', icon: <Share2 className="w-5 h-5" /> },
  { id: 'colaboradores', label: 'Colaboradores', icon: <UserPlus className="w-5 h-5" /> },
];

interface HelpCategoryNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

export const HelpCategoryNav = ({ activeCategory, onCategoryClick }: HelpCategoryNavProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeCategory === category.id
              ? 'bg-checkout-green text-white shadow-md'
              : 'bg-checkout-green/5 text-muted-foreground hover:bg-checkout-green/10 hover:text-foreground border border-checkout-green/10'
          }`}
        >
          {category.icon}
          <span className="hidden sm:inline">{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export { categories };
