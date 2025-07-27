
import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Store } from 'lucide-react';

const ModeSelection: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white flex items-center justify-center p-4 text-high-contrast">
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-strong">
            <Coffee className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">EasyLoyalty</h1>
          <p className="text-xl text-gray-700 font-medium">Choose how you want to continue</p>
        </div>

        <div className="space-y-6">
          {/* Customer Option */}
          <Card className="bg-white border-2 border-blue-300 rounded-3xl shadow-strong hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-8">
              <Button
                onClick={() => setLocation('/auth/customer')}
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-2xl shadow-lg transition-all duration-300"
              >
                Pokračovat jako zákazník
              </Button>
              <p className="text-center text-gray-600 mt-4 font-medium">
                Access your loyalty account and make payments
              </p>
            </CardContent>
          </Card>

          {/* Staff Option */}
          <Card className="bg-white border-2 border-blue-300 rounded-3xl shadow-strong hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-8">
              <Button
                onClick={() => setLocation('/admin/login')}
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white rounded-2xl shadow-lg transition-all duration-300"
              >
                Přihlásit se jako personál
              </Button>
              <p className="text-center text-gray-600 mt-4 font-medium">
                Access staff dashboard and payment processing
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            New to EasyLoyalty? Sign up as a customer to get started
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
