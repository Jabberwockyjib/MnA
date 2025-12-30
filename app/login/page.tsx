
import { login, signup, loginAsDev, loginWithGoogle } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Activity, TrendingUp } from "lucide-react"

function GoogleIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    )
}

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 3px),
                                 repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)`,
                backgroundSize: '50px 50px'
            }} />

            {/* Market ticker effect */}
            <div className="absolute top-0 left-0 right-0 border-b border-primary/20 bg-background/50 backdrop-blur-sm">
                <div className="px-6 py-3 flex items-center gap-6 text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-muted-foreground">SYSTEM ONLINE</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Intelligence Platform v1.0</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md animate-slide-in-up">
                {/* Logo / Header */}
                <div className="mb-8 text-center space-y-2">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="h-1 w-16 bg-primary" />
                        <Activity className="h-6 w-6 text-primary" />
                        <div className="h-1 w-16 bg-primary" />
                    </div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight">DealPulse</h1>
                    <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                        M&A Intelligence Platform
                    </p>
                </div>

                <Card className="border-2 border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="border-b-2 border-primary/20 pb-6">
                        <CardTitle className="text-2xl font-serif">Access Terminal</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Authenticate to access deal intelligence and monitoring.
                        </CardDescription>
                    </CardHeader>

                    {/* Google Sign-In */}
                    <CardContent className="pt-6 pb-0">
                        <form>
                            <Button
                                formAction={loginWithGoogle}
                                variant="outline"
                                className="w-full h-12 gap-3 border-2 hover:bg-accent"
                            >
                                <GoogleIcon />
                                <span className="font-medium">Continue with Google</span>
                            </Button>
                        </form>
                    </CardContent>

                    <div className="px-6 py-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-3 text-muted-foreground font-mono">OR USE EMAIL</span>
                            </div>
                        </div>
                    </div>

                    <form>
                        <CardContent className="grid gap-6 pt-0">
                            <div className="grid gap-3">
                                <Label htmlFor="email" className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="analyst@firm.com"
                                    required
                                    className="h-11 bg-background border-border font-mono"
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password" className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="h-11 bg-background border-border font-mono"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 border-t border-border pt-6">
                            <Button
                                formAction={login}
                                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                            >
                                Sign In
                            </Button>
                            <Button
                                formAction={signup}
                                variant="outline"
                                className="w-full h-11 border-primary/30 hover:border-primary hover:bg-primary/5"
                            >
                                Create Account
                            </Button>
                            <Button
                                formAction={loginAsDev}
                                variant="ghost"
                                className="w-full h-9 font-mono text-xs text-muted-foreground"
                                formNoValidate
                            >
                                DEV MODE ACCESS
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
                    <p>Secure authentication • 256-bit encryption</p>
                </div>
            </div>
        </div>
    )
}
