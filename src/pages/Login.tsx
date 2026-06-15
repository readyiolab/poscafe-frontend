import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, AlertCircle, Utensils, User, Lock, Eye, EyeOff } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans select-none transition-colors duration-300">
      {/* Ambient background glows */}
      <div 
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-[80px] md:blur-[180px] pointer-events-none animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-orange-600/5 dark:bg-orange-600/5 rounded-full blur-[60px] md:blur-[150px] pointer-events-none animate-pulse" 
        style={{ animationDuration: '12s' }} 
      />
      
      {/* Subtle Dot Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.05),rgba(255,255,255,0))] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} 
      />

      <div className="relative z-10 w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-700">
        {/* Branding header above card */}
        <div className="flex flex-col items-center mb-8 text-center space-y-3">
          <div className="flex aspect-square size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white dark:text-zinc-950 shadow-lg shadow-amber-500/10 dark:shadow-none border border-amber-400/20 transform transition-transform hover:scale-105 duration-300">
            <Utensils className="size-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              Cafe POS
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full tracking-wider uppercase">
                v3.0
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Smart billing & stock control for your outlet
            </p>
          </div>
        </div>

        {/* Login Glass Card */}
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-zinc-200/50 dark:shadow-black/80">
          <CardHeader className="space-y-1 text-center pt-8 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sign In
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
              Enter your credentials to access the terminal
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-700 dark:text-zinc-300 text-xs font-medium tracking-wide">
                  Username
                </Label>
                <InputGroup className="h-11 border-zinc-200 dark:border-zinc-800 focus-within:border-amber-500/50 focus-within:ring-amber-500/20 bg-white/50 dark:bg-zinc-950/40">
                  <InputGroupAddon align="inline-start" className="pl-3">
                    <User className="size-4 text-zinc-400 dark:text-zinc-500 group-focus-within/input-group:text-amber-500 transition-colors" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm"
                  />
                </InputGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300 text-xs font-medium tracking-wide">
                  Password
                </Label>
                <InputGroup className="h-11 border-zinc-200 dark:border-zinc-800 focus-within:border-amber-500/50 focus-within:ring-amber-500/20 bg-white/50 dark:bg-zinc-950/40">
                  <InputGroupAddon align="inline-start" className="pl-3">
                    <Lock className="size-4 text-zinc-400 dark:text-zinc-500 group-focus-within/input-group:text-amber-500 transition-colors" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-sm"
                  />
                  <InputGroupAddon align="inline-end" className="pr-1.5">
                    <InputGroupButton
                      onClick={() => setShowPassword(!showPassword)}
                      size="icon-sm"
                      className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 rounded-md transition-all"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-1">
                  <AlertCircle className="size-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] transition-all duration-200 mt-2 cursor-pointer border-none" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Open POS Terminal
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Footer info */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.25em] font-semibold">
            Cafe POS Terminal System
          </p>
          <p className="text-[9px] text-zinc-500 dark:text-zinc-700">
            Secure offline-capable transaction protocol active.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
