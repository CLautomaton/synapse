import { GetServerSideProps } from 'next';
import { getCsrfToken } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormLabel, Form, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { getSession } from 'next-auth/react';

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

type SignInFormData = z.infer<typeof schema>;

interface SignInProps {
  csrfToken: string | undefined;
}

export default function SignIn({ csrfToken }: SignInProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    // Handle form submission
    const result = await signIn('credentials', {
      redirect: false,
      username: data.username,
      password: data.password,
    });

    setIsLoading(false);
    if (result?.ok) {
      window.location.href = '/dashboard';
    } else {
      setAuthError(result?.error!);
    }
  };

  return (
    <div className="flex items-center flex-col justify-center min-h-screen bg-gray-100">
      <div className="p-4 m-14 bg-white rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center">Sign in to your Curious Frame account</h1>
      </div>
      <Form {...form} >
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)()}} className='inline-block'>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="username">Username</FormLabel>
                <FormControl>
                  <Input
                    id="username"
                    placeholder="Username"
                    {...field}
                    className='min-w-96'
                  />
                </FormControl>
                {/* <FormDescription>
                  This is your public display name.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" style={{marginTop: 12}}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Submit'}
          </Button>
          {authError && <p className="text-red-500">{authError}</p>}
        </form>
      </Form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (session) {
    return {
      redirect: {
        destination: '/dashboard', 
        permanent: false,
      },
    };
  }

  const csrfToken = await getCsrfToken(context);
  return {
    props: {
      csrfToken: csrfToken ?? null,
    },
  };
};