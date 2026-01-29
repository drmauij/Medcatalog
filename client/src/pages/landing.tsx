import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Package, 
  Building2, 
  FileText, 
  ShoppingCart, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="font-semibold text-lg">MedCatalog</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#suppliers" className="text-muted-foreground hover:text-foreground transition-colors">For Suppliers</a>
              <a href="#clinics" className="text-muted-foreground hover:text-foreground transition-colors">For Clinics</a>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <a href="/api/login">
                <Button data-testid="button-login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Shield className="h-4 w-4" />
                Trusted by Medical Professionals
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Medical Supply
                <span className="text-primary"> Catalog</span>
                <br />
                Management
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Streamline your medical supply procurement. Suppliers manage catalogs, 
                clinics request quotations, and everyone benefits from transparent pricing.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="/api/login">
                  <Button size="lg" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="#features">
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Free to use
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  Multi-supplier support
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <Card className="hover-elevate">
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium">Suppliers</span>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-accent" />
                      <span className="text-sm font-medium">Products</span>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-chart-3" />
                      <span className="text-sm font-medium">Quotations</span>
                    </CardContent>
                  </Card>
                  <Card className="hover-elevate">
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <ShoppingCart className="h-8 w-8 text-chart-4" />
                      <span className="text-sm font-medium">Orders</span>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform connecting medical suppliers with healthcare providers
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Catalog Management</h3>
                <p className="text-muted-foreground text-sm">
                  Suppliers can easily manage their product catalogs with categories, 
                  descriptions, and pack quantities.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg">Quotation System</h3>
                <p className="text-muted-foreground text-sm">
                  Clinics can request pricing for specific products. Suppliers respond 
                  with custom or default prices.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-chart-3" />
                </div>
                <h3 className="font-semibold text-lg">Multi-Supplier Support</h3>
                <p className="text-muted-foreground text-sm">
                  Support for multiple suppliers, each with their own catalog, 
                  pricing, and customer relationships.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-chart-4" />
                </div>
                <h3 className="font-semibold text-lg">Order Management</h3>
                <p className="text-muted-foreground text-sm">
                  Track orders from request to delivery. Payment handled offline 
                  for maximum flexibility.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-chart-5" />
                </div>
                <h3 className="font-semibold text-lg">Custom Pricing</h3>
                <p className="text-muted-foreground text-sm">
                  Suppliers can set default prices or provide custom quotes 
                  for specific clinic requests.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Secure & Reliable</h3>
                <p className="text-muted-foreground text-sm">
                  Enterprise-grade security with role-based access control 
                  for suppliers and clinics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg">
            Join MedCatalog today and streamline your medical supply management.
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-cta-login">
              Sign In Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">MedCatalog</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Medical Supply Catalog Management Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
