import { MapPinIcon } from 'lucide-react';
export const Header = () => {
  return <header className="bg-transparent py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center">
          <MapPinIcon className="h-6 w-6 text-black" />
          <span className="ml-2 text-xl font-bold">Itinerary Whisperer</span>
        </div>
      </div>
    </header>;
};