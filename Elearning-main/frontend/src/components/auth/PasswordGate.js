import React, { useState, useEffect } from "react";
import { Lock, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

const PasswordGate = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // You can change the password here
  const SITE_PASSWORD = "123"; 

  useEffect(() => {
    const authStatus = localStorage.getItem("site_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      localStorage.setItem("site_auth", "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (loading) return null;

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 font-sans" dir="rtl">
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">الوصول مقيد</CardTitle>
          <CardDescription className="text-slate-500">
            يرجى إدخال كلمة المرور لمتابعة الدخول للمنصة
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`text-center text-lg tracking-widest ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-1 justify-center animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>كلمة المرور غير صحيحة، حاول مرة أخرى</span>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full text-lg h-12 gap-2">
              <LogIn className="w-5 h-5" />
              دخول
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default PasswordGate;
