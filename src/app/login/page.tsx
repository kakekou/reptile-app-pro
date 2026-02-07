'use client';

import { useState } from 'react';
import { Turtle, Mail, Lock, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setError('確認メールを送信しました。メールを確認してください。');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else {
        router.push('/');
        router.refresh();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
            <Turtle size={32} className="text-accent-blue" />
          </div>
          <h1 className="text-[24px] font-bold">ReptiLog</h1>
          <p className="text-[14px] text-text-tertiary">爬虫類ブリーダー管理</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-11"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-11"
            />
          </div>

          {error && (
            <p className={`text-[13px] text-center ${error.includes('確認メール') ? 'text-accent-green' : 'text-accent-red'}`}>
              {error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            <LogIn size={18} />
            {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
          className="text-[14px] text-accent-blue"
        >
          {isSignUp ? 'アカウントをお持ちの方はログイン' : 'アカウントを新規作成'}
        </button>
      </div>
    </div>
  );
}
