
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Service, Product, Employee, ShopSettings, Appointment, SalonMetadata, Client, Transaction, Coupon, Tenant, SaasPlan } from './types';
import * as Storage from './services/storage';
import * as Gemini from './services/gemini';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { Plus, Trash2, Wand2, Clock, DollarSign, Box, CheckCircle2, Scissors, Package, Users, Phone, Calendar, ChevronLeft, User, Image as ImageIcon, X, CalendarDays, AlertCircle, Star, Search, MapPin as MapPinIcon, ArrowRight, ArrowLeft, Share2, ShoppingBag, TrendingUp, Wallet, LogIn, Eye, BarChart3, Trophy, KeyRound, Ticket, TrendingDown, Lock, Pencil, ExternalLink, LogOut, Minus, Rocket, ShieldCheck, Zap, Globe, Briefcase, LayoutList } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE WITH LAZY INITIALIZATION (PERFORMANCE FIX) ---
  // Change default view to SAAS_LP (Sales Home)
  const [view, setView] = useState<ViewState>(ViewState.SAAS_LP);
  
  const [services, setServices] = useState<Service[]>(() => Storage.getServices());
  const [products, setProducts] = useState<Product[]>(() => Storage.getProducts());
  const [employees, setEmployees] = useState<Employee[]>(() => Storage.getEmployees());
  const [appointments, setAppointments] = useState<Appointment[]>(() => Storage.getAppointments());
  const [settings, setSettings] = useState<ShopSettings>(() => Storage.getSettings());
  
  // Financial & Client State
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions());
  const [coupons, setCoupons] = useState<Coupon[]>(() => Storage.getCoupons());
  const [clients, setClients] = useState<Client[]>(() => Storage.getClients());
  const [currentUser, setCurrentUser] = useState<Client | null>(null);

  // Marketplace State
  const [platformSalons, setPlatformSalons] = useState<SalonMetadata[]>(() => Storage.getPlatformSalons());
  const [searchQuery, setSearchQuery] = useState('');

  // SaaS State
  const [tenants, setTenants] = useState<Tenant[]>(() => Storage.getTenants());
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>(() => Storage.getSaasPlans());

  // Public/Landing Page State
  const [showLandingPage, setShowLandingPage] = useState(false);
  const [currentSalonMetadata, setCurrentSalonMetadata] = useState<SalonMetadata | null>(null);
  
  // Shopping Cart State
  const [cart, setCart] = useState<Product[]>([]);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // Admin Login Modal
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [editingItem, setEditingItem] = useState<Partial<Service | Product | Employee | Transaction | Coupon | SaasPlan> | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // Client Booking Wizard State
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [bookingStep, setBookingStep] = useState(0); // 0: Service, 1: Professional, 2: Date/Time, 3: Confirm
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');

  // Client Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', birthDate: '', password: '' });

  // --- INITIALIZATION & ROUTING SIMULATION ---

  useEffect(() => {
    // 1. Load Marketplace & SaaS Data
    const allSalons = Storage.getPlatformSalons();
    setPlatformSalons(allSalons);
    setTenants(Storage.getTenants());
    setSaasPlans(Storage.getSaasPlans());

    // 2. Check URL Params for deep linking
    const urlParams = new URLSearchParams(window.location.search);
    const salonSlug = urlParams.get('salon');
    const isAdmin = urlParams.get('admin');
    const isSaas = urlParams.get('saas');

    if (isSaas === 'admin') {
      setView(ViewState.SAAS_ADMIN);
    } else if (isAdmin) {
      handleAdminLogin();
    } else if (salonSlug) {
      const metadata = allSalons.find(s => s.slug === salonSlug);
      if (metadata) {
        handleNavigateToSalon(salonSlug, metadata, false);
      } else {
        setView(ViewState.MARKETPLACE);
      }
    } else {
      // Default to SaaS Landing Page (Sales Home) when accessing domain root
      setView(ViewState.SAAS_LP);
    }

    // Handle Browser Back Button
    const handlePopState = () => {
       const params = new URLSearchParams(window.location.search);
       const slug = params.get('salon');
       const saas = params.get('saas');
       
       if (saas === 'admin') {
           setView(ViewState.SAAS_ADMIN);
       } else if (slug) {
         const meta = allSalons.find(s => s.slug === slug);
         if (meta) handleNavigateToSalon(slug, meta, false);
       } else {
         // If back to root, show Sales LP
         setView(ViewState.SAAS_LP);
       }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    
    const handleLoginClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('button[data-action="login"]');
        if (btn) {
            setIsLoginModalOpen(true);
        }
    };
    document.addEventListener('click', handleLoginClick);
    return () => document.removeEventListener('click', handleLoginClick);

  }, []);

  const loadSalonData = () => {
    setServices(Storage.getServices());
    setProducts(Storage.getProducts());
    setEmployees(Storage.getEmployees());
    setAppointments(Storage.getAppointments());
    setSettings(Storage.getSettings());
    setTransactions(Storage.getTransactions());
    setCoupons(Storage.getCoupons());
    setClients(Storage.getClients());
  };

  // --- NAVIGATION HANDLERS ---

  const handleNavigateToSalon = (slug: string, metadata?: SalonMetadata, updateHistory = true) => {
    Storage.setCurrentNamespace(slug);
    Storage.incrementViews();

    const meta = metadata || platformSalons.find(s => s.slug === slug) || null;
    setCurrentSalonMetadata(meta);

    loadSalonData();
    setCart([]); 

    setView(ViewState.PUBLIC_SALON);
    setShowLandingPage(true);
    
    if (updateHistory) {
      const newUrl = `${window.location.pathname}?salon=${slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleBackToMarketplace = (updateHistory = true) => {
    setView(ViewState.MARKETPLACE);
    setShowLandingPage(false);
    setCurrentUser(null);
    setIsBookingMode(false);
    setCurrentSalonMetadata(null);
    
    if (updateHistory) {
      const newUrl = window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleAdminLogout = () => {
      if(confirm("Deseja realmente sair da área administrativa?")) {
          setView(ViewState.SAAS_LP); // Return to Main Sales Home
          setCurrentSalonMetadata(null); // Clear context
          window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
      }
  };

  const handleAdminLogin = () => {
    // Logic for Super Admin Login (Demo)
    if (loginEmail === 'super@admin.com') {
      setView(ViewState.SAAS_ADMIN);
      setIsLoginModalOpen(false);
      return;
    }

    // If we are NOT in a specific salon (i.e. Marketplace or SaaS LP), switch to demo admin.
    // If we ARE in a salon (currentSalonMetadata is set), we assume we are logging into THIS salon.
    if (!currentSalonMetadata) {
        const adminNamespace = 'admin_demo_account';
        Storage.setCurrentNamespace(adminNamespace);
    }
    // Else: we keep the current namespace so the owner manages THEIR salon.

    // Seed data if empty
    const currentServices = Storage.getServices();
    if (currentServices.length === 0) {
        Storage.saveServices(Storage.getServices());
        Storage.saveProducts(Storage.getProducts());
        Storage.saveEmployees(Storage.getEmployees());
        
        // Seed Appointments & Transactions for demo purposes
        const mockHistory: Appointment[] = [];
        const mockTransactions: Transaction[] = [];
        const today = new Date();
        
        // Expense seeds
        mockTransactions.push({
             id: generateId(), title: 'Conta de Luz', amount: 350, type: 'expense', category: 'operational', status: 'paid', date: new Date().toISOString().split('T')[0]
        });
        mockTransactions.push({
             id: generateId(), title: 'Aluguel', amount: 1500, type: 'expense', category: 'operational', status: 'pending', date: new Date().toISOString().split('T')[0]
        });

        for (let i = 0; i < 7; i++) {
           const date = new Date(today);
           date.setDate(date.getDate() - i);
           const dateStr = date.toISOString().split('T')[0];
           
           const count = Math.floor(Math.random() * 5) + 1;
           for(let j=0; j<count; j++) {
              const appId = generateId();
              const price = 50;
              const isCancelled = j % 4 === 0;
              
              mockHistory.push({
                 id: appId,
                 serviceId: '1',
                 serviceName: 'Corte Clássico',
                 employeeId: '1',
                 employeeName: 'Carlos Navalha',
                 date: dateStr,
                 time: `${10+j}:00`,
                 price: price,
                 totalPrice: price,
                 duration: 40,
                 status: isCancelled ? 'cancelled' : 'completed',
                 createdAt: date.getTime()
              });

              if (!isCancelled) {
                  mockTransactions.push({
                      id: generateId(),
                      title: 'Corte Clássico - Cliente Mock',
                      amount: price,
                      type: 'income',
                      category: 'service',
                      status: 'paid',
                      date: dateStr,
                      relatedAppointmentId: appId
                  });
              }
           }
        }
        Storage.saveAppointments(mockHistory);
        Storage.saveTransactions(mockTransactions);
        
        const settings = Storage.getSettings();
        if (settings.views === 0) {
            settings.views = 1240;
            Storage.saveSettings(settings);
        }
    }

    loadSalonData();
    setView(ViewState.DASHBOARD);
    setShowLandingPage(false); 
    setIsLoginModalOpen(false);
    setLoginEmail('');
    setLoginPassword('');
  };
  
  const fillDemoLogin = () => {
    setLoginEmail('admin@beleza.app');
    setLoginPassword('123456');
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // --- CART HANDLERS ---
  const getCartCount = (productId: string) => cart.filter(p => p.id === productId).length;

  const handleAddToCart = (product: Product) => {
    const currentCount = getCartCount(product.id);
    if (currentCount < product.stock) {
        setCart([...cart, product]);
    } else {
        alert("Estoque máximo atingido para este produto.");
    }
  };

  const handleRemoveOneFromCart = (productId: string) => {
    const index = cart.findIndex(p => p.id === productId);
    if (index > -1) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
    }
  };

  // --- SAVE HANDLERS ---

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const item = editingItem as Partial<Service>;
    if (!item || !item.name) return;
    const newItem: Service = { ...item, id: item.id || generateId(), duration: item.duration || 30 } as Service;
    const updated = item.id ? services.map(s => s.id === newItem.id ? newItem : s) : [...services, newItem];
    setServices(updated);
    Storage.saveServices(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const item = editingItem as Partial<Product>;
    if (!item || !item.name) return;
    const newItem: Product = { ...item, id: item.id || generateId(), price: item.price || 0, stock: item.stock || 0 } as Product;
    const updated = item.id ? products.map(p => p.id === newItem.id ? newItem : p) : [...products, newItem];
    setProducts(updated);
    Storage.saveProducts(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const item = editingItem as Partial<Employee>;
    if (!item || !item.name) return;
    const newItem: Employee = { ...item, id: item.id || generateId(), role: item.role || 'Profissional' } as Employee;
    const updated = item.id ? employees.map(e => e.id === newItem.id ? newItem : e) : [...employees, newItem];
    setEmployees(updated);
    Storage.saveEmployees(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;
      const item = editingItem as Transaction;
      if (!item.title || !item.amount) return alert('Preencha os campos obrigatórios');

      const newItem: Transaction = {
          id: item.id || generateId(),
          title: item.title,
          amount: parseFloat(String(item.amount)),
          type: item.type || 'expense',
          category: item.category || 'operational',
          status: item.status || 'paid',
          date: item.date || new Date().toISOString().split('T')[0]
      };

      const updated = item.id ? transactions.map(t => t.id === newItem.id ? newItem : t) : [...transactions, newItem];
      setTransactions(updated);
      Storage.saveTransactions(updated);
      setIsModalOpen(false);
      setEditingItem(null);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;
      const item = editingItem as Coupon;
      if (!item.code || !item.discount) return;

      const newItem: Coupon = {
          id: item.id || generateId(),
          code: item.code.toUpperCase(),
          discount: parseFloat(String(item.discount)),
          type: item.type || 'fixed',
          active: item.active ?? true,
          usageCount: item.usageCount || 0
      };

      const updated = item.id ? coupons.map(c => c.id === newItem.id ? newItem : c) : [...coupons, newItem];
      setCoupons(updated);
      Storage.saveCoupons(updated);
      setIsModalOpen(false);
      setEditingItem(null);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const item = editingItem as any;
    if (!item.name) return;

    let featuresList = item.features;
    if (typeof item.features === 'string') {
        featuresList = item.features.split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
    }

    const newItem: SaasPlan = {
        id: item.id || generateId(),
        name: item.name,
        price: parseFloat(String(item.price || 0)),
        features: featuresList || [],
        isRecommended: item.isRecommended || false
    };

    const updated = item.id ? saasPlans.map(p => p.id === newItem.id ? newItem : p) : [...saasPlans, newItem];
    setSaasPlans(updated);
    Storage.saveSaasPlans(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };


  const handleDelete = (id: string, type: 'service' | 'product' | 'employee' | 'transaction' | 'coupon' | 'plan') => {
    if (confirm('Tem certeza que deseja remover?')) {
      if (type === 'service') {
        const updated = services.filter(s => s.id !== id);
        setServices(updated);
        Storage.saveServices(updated);
      } else if (type === 'product') {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        Storage.saveProducts(updated);
      } else if (type === 'employee') {
        const updated = employees.filter(e => e.id !== id);
        setEmployees(updated);
        Storage.saveEmployees(updated);
      } else if (type === 'transaction') {
         const updated = transactions.filter(t => t.id !== id);
         setTransactions(updated);
         Storage.saveTransactions(updated);
      } else if (type === 'coupon') {
         const updated = coupons.filter(c => c.id !== id);
         setCoupons(updated);
         Storage.saveCoupons(updated);
      } else if (type === 'plan') {
         const updated = saasPlans.filter(p => p.id !== id);
         setSaasPlans(updated);
         Storage.saveSaasPlans(updated);
      }
    }
  };

  // --- AI HANDLERS ---
  const handleGenerateDescription = async () => {
    const item = editingItem as any;
    if (!item?.name) return alert('Digite o nome primeiro');
    setIsLoadingAI(true);
    let type: 'service' | 'product' | 'employee' = 'service';
    let extraInfo = '';
    if (view === ViewState.PRODUCTS) type = 'product';
    if (view === ViewState.TEAM) { type = 'employee'; extraInfo = (editingItem as Employee).role || ''; }
    const desc = await Gemini.generateDescription(item.name, type, extraInfo);
    setEditingItem(prev => ({ ...prev, description: desc } as any));
    setIsLoadingAI(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300;
            let width = img.width, height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            setEditingItem(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg', 0.8) } as any));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CLIENT AUTH HANDLERS ---

  const handleAuthSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Simple validation
      if (!authForm.phone) return alert("Telefone obrigatório");

      const existingClient = clients.find(c => c.phone === authForm.phone);

      if (authMode === 'login') {
          if (existingClient) {
              if (existingClient.password && existingClient.password !== authForm.password) {
                  return alert("Senha incorreta");
              }
              setCurrentUser(existingClient);
              // After login, return to context
              if (view === ViewState.CLIENT_STORE || view === ViewState.CLIENT_PREVIEW || view === ViewState.PUBLIC_SALON) {
                  // Stay in view
              } else {
                  setView(ViewState.PUBLIC_SALON);
              }
          } else {
              if (confirm("Número não encontrado. Deseja cadastrar?")) {
                  setAuthMode('register');
              }
          }
      } else {
          // Register
          if (existingClient) return alert("Cliente já cadastrado com este telefone.");
          
          const newClient: Client = {
              id: generateId(),
              name: authForm.name || 'Cliente',
              phone: authForm.phone,
              birthDate: authForm.birthDate,
              password: authForm.password,
              createdAt: Date.now()
          };
          Storage.saveClient(newClient);
          setClients([...clients, newClient]);
          setCurrentUser(newClient);
          // Stay
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      handleBackToMarketplace(true);
  };

  // --- BOOKING & ORDER HANDLERS ---

  const handleApplyCoupon = () => {
      const coupon = coupons.find(c => c.code === couponCodeInput.toUpperCase() && c.active);
      if (coupon) {
          setAppliedCoupon(coupon);
          alert("Cupom aplicado com sucesso!");
      } else {
          alert("Cupom inválido ou expirado.");
          setAppliedCoupon(null);
      }
  };

  const handleProductOrder = () => {
      if (cart.length === 0) return alert("Carrinho vazio");
      if (!currentUser) return setView(ViewState.CLIENT_AUTH); // Force auth for orders

      const productsTotal = cart.reduce((sum, p) => sum + p.price, 0);
      
      // Create Transaction
      const newTransaction: Transaction = {
          id: generateId(),
          title: `Pedido Loja - ${currentUser.name}`,
          amount: productsTotal,
          type: 'income',
          category: 'product',
          status: 'pending',
          date: new Date().toISOString().split('T')[0],
      };
      const updatedTrans = [...transactions, newTransaction];
      setTransactions(updatedTrans);
      Storage.saveTransactions(updatedTrans);

      // Create Appointment placeholder for order tracking
      const newOrder: Appointment = {
          id: generateId(),
          serviceId: 'product_order',
          serviceName: 'Pedido de Produtos',
          employeeId: null,
          employeeName: 'Retirada na Loja',
          products: cart,
          clientId: currentUser.id,
          clientName: currentUser.name,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString().slice(0,5),
          price: 0,
          totalPrice: productsTotal,
          duration: 0,
          status: 'completed',
          createdAt: Date.now()
      };
      const updatedApps = [...appointments, newOrder];
      setAppointments(updatedApps);
      Storage.saveAppointments(updatedApps);

      // Update Stock
      const updatedProducts = products.map(prod => {
        const countInCart = cart.filter(p => p.id === prod.id).length;
        if (countInCart > 0) {
            return { ...prod, stock: Math.max(0, prod.stock - countInCart) };
        }
        return prod;
      });
      setProducts(updatedProducts);
      Storage.saveProducts(updatedProducts);

      alert("Pedido realizado com sucesso! Retire no balcão.");
      setCart([]);
      // Go to appointments/orders tab
      setView(ViewState.PUBLIC_SALON); // Will render dashboard since isBookingMode is false
  };

  const handleConfirmBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    const productsTotal = cart.reduce((sum, p) => sum + p.price, 0);
    let subTotal = selectedService.price + productsTotal;
    let discount = 0;

    if (appliedCoupon) {
        if (appliedCoupon.type === 'fixed') {
            discount = appliedCoupon.discount;
        } else {
            discount = (subTotal * appliedCoupon.discount) / 100;
        }
    }
    const finalPrice = Math.max(0, subTotal - discount);

    const newAppointment: Appointment = {
      id: generateId(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      employeeId: selectedEmployee ? selectedEmployee.id : null,
      employeeName: selectedEmployee ? selectedEmployee.name : 'Preferência do Salão',
      employeePhotoUrl: selectedEmployee?.photoUrl,
      products: cart,
      clientId: currentUser?.id,
      clientName: currentUser?.name,
      date: selectedDate,
      time: selectedTime,
      price: selectedService.price,
      totalPrice: finalPrice,
      discount: discount,
      couponCode: appliedCoupon?.code,
      duration: selectedService.duration,
      status: 'scheduled',
      createdAt: Date.now()
    };

    // 1. Save Appointment
    const updatedApps = [...appointments, newAppointment];
    setAppointments(updatedApps);
    Storage.saveAppointments(updatedApps);

    // 2. Update Product Stock
    const updatedProducts = products.map(prod => {
        const countInCart = cart.filter(p => p.id === prod.id).length;
        if (countInCart > 0) {
            return { ...prod, stock: Math.max(0, prod.stock - countInCart) };
        }
        return prod;
    });
    setProducts(updatedProducts);
    Storage.saveProducts(updatedProducts);

    // 3. Create Financial Transaction (Pending Income)
    const newTransaction: Transaction = {
        id: generateId(),
        title: `Agendamento: ${selectedService.name} - ${currentUser?.name || 'Cliente'}`,
        amount: finalPrice,
        type: 'income',
        category: 'service',
        status: 'pending', // Previsão de recebimento
        date: selectedDate,
        relatedAppointmentId: newAppointment.id
    };
    const updatedTrans = [...transactions, newTransaction];
    setTransactions(updatedTrans);
    Storage.saveTransactions(updatedTrans);
    
    // 4. Update Coupon Usage
    if (appliedCoupon) {
        const updatedCoupons = coupons.map(c => 
            c.id === appliedCoupon.id ? { ...c, usageCount: c.usageCount + 1 } : c
        );
        setCoupons(updatedCoupons);
        Storage.saveCoupons(updatedCoupons);
    }
    
    alert('Agendamento confirmado com sucesso!');
    setIsBookingMode(false);
    setBookingStep(0);
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedTime('');
    setCart([]); 
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  const initiateCancelAppointment = (id: string) => setAppointmentToCancel(id);

  const confirmCancellation = () => {
    if (appointmentToCancel) {
      // Cancel Appointment
      const updatedApps = appointments.map(app => 
        app.id === appointmentToCancel ? { ...app, status: 'cancelled' as const } : app
      );
      setAppointments(updatedApps);
      Storage.saveAppointments(updatedApps);

      // Cancel/Delete Related Transaction
      const updatedTrans = transactions.filter(t => t.relatedAppointmentId !== appointmentToCancel);
      setTransactions(updatedTrans);
      Storage.saveTransactions(updatedTrans);

      setAppointmentToCancel(null);
    }
  };

  // --- RENDER HELPERS ---

  const renderClientStore = () => (
      <div className="animate-fadeIn pb-24">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Loja</h2>
              <div className="relative">
                  <ShoppingBag className="text-rose-600" size={24} />
                  {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                          {cart.length}
                      </span>
                  )}
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
               {products.map(product => {
                    const countInCart = getCartCount(product.id);
                    const isOutOfStock = product.stock <= 0;
                    
                    return (
                        <div key={product.id} className={`bg-white border rounded-xl p-3 flex flex-col shadow-sm ${countInCart > 0 ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-100'} ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                           <div className="h-32 bg-slate-100 rounded-lg mb-2 overflow-hidden relative">
                              {product.photoUrl && <img src={product.photoUrl} className="w-full h-full object-cover" />}
                              {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold uppercase">Esgotado</div>}
                           </div>
                           <h4 className="font-bold text-sm truncate">{product.name}</h4>
                           <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                           <p className="text-sm font-bold text-slate-800 mt-2 mb-3">{settings.currency} {product.price}</p>
                           
                           {isOutOfStock ? (
                               <button disabled className="mt-auto w-full py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed">
                                   Indisponível
                               </button>
                           ) : (
                               countInCart > 0 ? (
                                   <div className="mt-auto flex items-center justify-between bg-rose-50 rounded-lg p-1.5">
                                       <button onClick={() => handleRemoveOneFromCart(product.id)} className="p-1 text-rose-600 hover:bg-rose-200 rounded">
                                           <Minus size={16} />
                                       </button>
                                       <span className="text-sm font-bold text-rose-700">{countInCart}</span>
                                       <button onClick={() => handleAddToCart(product)} className="p-1 text-rose-600 hover:bg-rose-200 rounded">
                                           <Plus size={16} />
                                       </button>
                                   </div>
                               ) : (
                                   <button 
                                      onClick={() => handleAddToCart(product)}
                                      className="mt-auto w-full py-2 rounded-lg text-xs font-bold bg-slate-900 text-white transition hover:bg-black"
                                   >
                                      Adicionar
                                   </button>
                               )
                           )}
                        </div>
                    );
                })}
          </div>

          {cart.length > 0 && (
             <div className="fixed bottom-20 left-4 right-4 z-40">
                 <button 
                    onClick={handleProductOrder}
                    className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-rose-200/50 flex items-center justify-between px-6"
                 >
                    <span>Finalizar Pedido</span>
                    <span className="bg-white/20 px-2 py-1 rounded text-sm">
                        {settings.currency} {cart.reduce((acc, item) => acc + item.price, 0).toFixed(2)}
                    </span>
                 </button>
             </div>
          )}
      </div>
  );

  const renderServiceForm = () => (
    <form onSubmit={handleSaveService} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nome do Serviço</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Service)?.name || ''}
            onChange={e => setEditingItem({ ...(editingItem as Service), name: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={isLoadingAI}
            className="mt-1 bg-purple-100 text-purple-600 p-2 rounded-md hover:bg-purple-200 transition"
            title="Gerar descrição com IA"
          >
            {isLoadingAI ? <Wand2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Preço</label>
        <input
          type="number"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Service)?.price || ''}
          onChange={e => setEditingItem({ ...(editingItem as Service), price: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Duração (min)</label>
        <input
          type="number"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Service)?.duration || ''}
          onChange={e => setEditingItem({ ...(editingItem as Service), duration: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Descrição</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Service)?.description || ''}
          onChange={e => setEditingItem({ ...(editingItem as Service), description: e.target.value })}
          rows={3}
        />
      </div>
      <button type="submit" className="w-full bg-rose-600 text-white py-2 px-4 rounded-md hover:bg-rose-700 transition font-bold">
        Salvar Serviço
      </button>
    </form>
  );

  const renderProductForm = () => (
    <form onSubmit={handleSaveProduct} className="space-y-4">
       <div className="flex justify-center mb-4">
        <div className="relative w-24 h-24 bg-slate-100 rounded-xl overflow-hidden group cursor-pointer border-2 border-dashed border-slate-300 hover:border-rose-500 transition">
           {(editingItem as Product)?.photoUrl ? (
             <img src={(editingItem as Product).photoUrl} alt="Preview" className="w-full h-full object-cover" />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <ImageIcon size={24} />
               <span className="text-[10px] mt-1">Foto</span>
             </div>
           )}
           <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Nome do Produto</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Product)?.name || ''}
            onChange={e => setEditingItem({ ...(editingItem as Product), name: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={isLoadingAI}
            className="mt-1 bg-purple-100 text-purple-600 p-2 rounded-md hover:bg-purple-200 transition"
          >
            {isLoadingAI ? <Wand2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Preço</label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Product)?.price || ''}
            onChange={e => setEditingItem({ ...(editingItem as Product), price: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estoque</label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Product)?.stock || ''}
            onChange={e => setEditingItem({ ...(editingItem as Product), stock: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Descrição</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Product)?.description || ''}
          onChange={e => setEditingItem({ ...(editingItem as Product), description: e.target.value })}
          rows={2}
        />
      </div>
      <button type="submit" className="w-full bg-rose-600 text-white py-2 px-4 rounded-md hover:bg-rose-700 transition font-bold">
        Salvar Produto
      </button>
    </form>
  );

  const renderEmployeeForm = () => (
    <form onSubmit={handleSaveEmployee} className="space-y-4">
      <div className="flex justify-center mb-4">
        <div className="relative w-24 h-24 bg-slate-100 rounded-full overflow-hidden group cursor-pointer border-2 border-dashed border-slate-300 hover:border-rose-500 transition">
           {(editingItem as Employee)?.photoUrl ? (
             <img src={(editingItem as Employee).photoUrl} alt="Preview" className="w-full h-full object-cover" />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <User size={32} />
             </div>
           )}
           <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Nome</label>
         <div className="flex gap-2">
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Employee)?.name || ''}
            onChange={e => setEditingItem({ ...(editingItem as Employee), name: e.target.value })}
            required
          />
           <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={isLoadingAI}
            className="mt-1 bg-purple-100 text-purple-600 p-2 rounded-md hover:bg-purple-200 transition"
          >
            {isLoadingAI ? <Wand2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Cargo</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Employee)?.role || ''}
          onChange={e => setEditingItem({ ...(editingItem as Employee), role: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Bio</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Employee)?.bio || ''}
          onChange={e => setEditingItem({ ...(editingItem as Employee), bio: e.target.value })}
          rows={3}
        />
      </div>
      <button type="submit" className="w-full bg-rose-600 text-white py-2 px-4 rounded-md hover:bg-rose-700 transition font-bold">
        Salvar Profissional
      </button>
    </form>
  );

  const renderClientAuth = () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-fadeIn">
          <button onClick={() => { setIsBookingMode(false); setShowLandingPage(true); }} className="absolute top-4 left-4 p-2 bg-white rounded-full text-slate-600 shadow-sm">
              <ChevronLeft size={24} />
          </button>
          <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
              <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">{authMode === 'login' ? 'Bem-vindo de volta' : 'Criar Conta'}</h2>
                  <p className="text-slate-500 text-sm">Identifique-se para continuar</p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === 'register' && (
                      <input 
                          type="text" 
                          placeholder="Seu Nome" 
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
                          value={authForm.name}
                          onChange={e => setAuthForm({...authForm, name: e.target.value})}
                      />
                  )}
                  <div className="relative">
                      <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input 
                          type="tel" 
                          placeholder="WhatsApp / Telefone" 
                          required
                          className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
                          value={authForm.phone}
                          onChange={e => setAuthForm({...authForm, phone: e.target.value})}
                      />
                  </div>
                  
                  {authMode === 'register' && (
                       <input 
                          type="date" 
                          placeholder="Data Nascimento" 
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none text-slate-500"
                          value={authForm.birthDate}
                          onChange={e => setAuthForm({...authForm, birthDate: e.target.value})}
                      />
                  )}

                  <div className="relative">
                       <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                       <input 
                          type="password" 
                          placeholder={authMode === 'login' ? "Senha (se tiver)" : "Senha (Opcional)"} 
                          className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
                          value={authForm.password}
                          onChange={e => setAuthForm({...authForm, password: e.target.value})}
                      />
                  </div>
                  
                  <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition">
                      {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
                  </button>
              </form>

              <div className="mt-6 text-center text-sm">
                  {authMode === 'login' ? (
                      <p className="text-slate-500">Não tem conta? <button onClick={() => setAuthMode('register')} className="text-rose-600 font-bold hover:underline">Cadastre-se</button></p>
                  ) : (
                      <p className="text-slate-500">Já tem conta? <button onClick={() => setAuthMode('login')} className="text-rose-600 font-bold hover:underline">Entrar</button></p>
                  )}
              </div>
          </div>
      </div>
  );

  const renderSaasPlans = () => (
      <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Ticket size={24} className="text-rose-600"/> Gestão de Planos
              </h3>
              <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-rose-700 transition flex items-center gap-2">
                  <Plus size={16} /> Novo Plano
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {saasPlans.map(plan => (
                  <div key={plan.id} className={`bg-white p-6 rounded-2xl border ${plan.isRecommended ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-100'} shadow-sm relative`}>
                      {plan.isRecommended && <span className="absolute top-4 right-4 text-[10px] font-bold uppercase bg-rose-100 text-rose-600 px-2 py-1 rounded">Recomendado</span>}
                      <h4 className="text-lg font-bold text-slate-800">{plan.name}</h4>
                      <p className="text-3xl font-bold text-slate-900 mt-2">R$ {plan.price}<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                      
                      <ul className="mt-4 space-y-2 mb-6">
                          {plan.features.map((feature, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-green-500" /> {feature}
                              </li>
                          ))}
                      </ul>

                      <div className="flex gap-2">
                           <button onClick={() => { setEditingItem({...plan, features: plan.features.join(', ')} as any); setIsModalOpen(true); }} className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 flex items-center justify-center gap-1">
                               <Pencil size={14} /> Editar
                           </button>
                           <button onClick={() => handleDelete(plan.id, 'plan')} className="py-2 px-3 rounded-lg bg-red-50 text-red-500 font-bold hover:bg-red-100">
                               <Trash2 size={14} />
                           </button>
                      </div>
                  </div>
              ))}
          </div>
          <button onClick={() => setView(ViewState.SAAS_ADMIN)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
              <ArrowLeft size={16} /> Voltar ao Dashboard
          </button>
      </div>
  );

  const renderSaaSAdmin = () => {
    // Memoize stats to avoid recalculating on every render
    const stats = useMemo(() => {
        const totalRevenue = tenants.reduce((acc, t) => acc + t.mrr, 0);
        const totalTenants = tenants.length;
        const activeTenants = tenants.filter(t => t.status === 'active').length;
        const proTenants = tenants.filter(t => t.plan === 'pro').length;
        return { totalRevenue, totalTenants, activeTenants, proTenants };
    }, [tenants]);

    return (
      <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 <ShieldCheck className="text-rose-600" /> Super Admin
              </h1>
              <p className="text-slate-500">Gestão da Plataforma</p>
           </div>
           <button onClick={() => setView(ViewState.MARKETPLACE)} className="text-sm font-bold text-slate-500 hover:text-slate-800">
              Sair
           </button>
        </div>

        {/* Action Tabs */}
        <div className="flex gap-4 border-b border-slate-200 pb-1">
            <button className="text-rose-600 border-b-2 border-rose-600 pb-2 font-bold px-2">Dashboard</button>
            <button onClick={() => setView(ViewState.SAAS_PLANS)} className="text-slate-500 hover:text-slate-800 pb-2 font-medium px-2 flex items-center gap-1"><Ticket size={16}/> Gerenciar Planos</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">MRR (Mensal)</p>
               <h3 className="text-3xl font-bold text-rose-600">R$ {stats.totalRevenue.toFixed(2)}</h3>
               <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><TrendingUp size={12}/> +12% esse mês</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total de Salões</p>
               <h3 className="text-3xl font-bold text-slate-800">{stats.totalTenants}</h3>
               <p className="text-xs text-slate-400 mt-2">{stats.activeTenants} ativos</p>
           </div>
           <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Plano Pro</p>
               <h3 className="text-3xl font-bold">{stats.proTenants}</h3>
               <p className="text-xs text-slate-400 mt-2">Salões Pagantes</p>
           </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">Salões Cadastrados</h3>
               <div className="flex gap-2">
                  <input type="text" placeholder="Buscar salão..." className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-rose-500" />
               </div>
            </div>
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                     <th className="px-6 py-3">Nome / Slug</th>
                     <th className="px-6 py-3">Dono</th>
                     <th className="px-6 py-3">Plano</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3">MRR</th>
                     <th className="px-6 py-3">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {tenants.map(tenant => (
                     <tr key={tenant.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                           <p className="font-bold text-slate-800">{tenant.slug}</p>
                           <p className="text-xs text-slate-400">ID: {tenant.id}</p>
                        </td>
                        <td className="px-6 py-4">
                           <p className="text-slate-700">{tenant.ownerName}</p>
                           <p className="text-xs text-slate-400">{tenant.email}</p>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tenant.plan === 'Pro' ? 'bg-purple-100 text-purple-700' : tenant.plan === 'Enterprise' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {tenant.plan}
                           </span>
                        </td>
                         <td className="px-6 py-4">
                           <span className={`flex items-center gap-1 font-bold text-xs ${tenant.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${tenant.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                              {tenant.status === 'active' ? 'Ativo' : 'Cancelado'}
                           </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">R$ {tenant.mrr}</td>
                        <td className="px-6 py-4">
                           <button onClick={() => handleNavigateToSalon(tenant.slug)} className="text-rose-600 hover:underline text-xs font-bold flex items-center gap-1">
                              <ExternalLink size={12} /> Acessar
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
        </div>
      </div>
    );
  };

  const renderSaaSLandingPage = () => {
    return (
      <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
             <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="bg-rose-600 p-1.5 rounded-lg text-white">
                        <Scissors size={20} />
                    </div>
                    <span className="font-bold text-xl text-slate-800">BelezaApp <span className="text-slate-400 font-light">Pro</span></span>
                 </div>
                 <div className="flex gap-4 items-center">
                     <button onClick={() => setIsLoginModalOpen(true)} className="text-slate-600 font-bold hover:text-rose-600 flex items-center gap-2 text-sm">
                         <Lock size={16} /> Área do Parceiro
                     </button>
                 </div>
             </div>
          </header>

          {/* Hero */}
          <section className="pt-20 pb-32 px-6 text-center max-w-4xl mx-auto">
              <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full text-sm mb-6 inline-block">Plataforma #1 para Salões e Barbearias</span>
              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                  Seu salão com <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600">agendamento online</span> e gestão completa.
              </h1>
              <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
                  Encontre os melhores salões da sua cidade ou gerencie seu próprio negócio com o BelezaApp.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                  {/* BOTÕES DE ESCOLHA SOLICITADOS PELO USUÁRIO */}
                  <button onClick={() => setView(ViewState.MARKETPLACE)} className="bg-white text-rose-600 border-2 border-rose-100 px-8 py-4 rounded-xl font-bold text-lg hover:bg-rose-50 transition shadow-lg shadow-rose-100 flex items-center justify-center gap-2">
                      <Search size={20} /> Encontrar um Salão
                  </button>
                  <button onClick={() => setIsLoginModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition flex items-center justify-center gap-2">
                      <Briefcase size={20} /> Sou Dono de Salão
                  </button>
              </div>
          </section>

          {/* Features */}
          <section className="bg-white py-24 border-y border-slate-100">
              <div className="max-w-6xl mx-auto px-6">
                  <div className="grid md:grid-cols-3 gap-12">
                      <div className="text-center">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                              <Globe size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-3">Site Exclusivo</h3>
                          <p className="text-slate-500">Seu salão ganha uma página profissional com link personalizado para enviar no WhatsApp.</p>
                      </div>
                      <div className="text-center">
                          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                              <Wallet size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-3">Controle Financeiro</h3>
                          <p className="text-slate-500">Saiba exatamente quanto entra e sai. Controle comissões, despesas e lucro real.</p>
                      </div>
                      <div className="text-center">
                          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                              <Zap size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-3">Inteligência Artificial</h3>
                          <p className="text-slate-500">Descrição de serviços e produtos geradas automaticamente para vender mais.</p>
                      </div>
                  </div>
              </div>
          </section>

          {/* Dynamic Pricing Section */}
          <section className="py-24 px-6 bg-slate-50">
             <div className="max-w-4xl mx-auto text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-800 mb-4">Planos para todos os tamanhos</h2>
                <p className="text-slate-500">Escolha o ideal para o seu momento.</p>
             </div>
             <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-6">
                 {saasPlans.map(plan => (
                     <div key={plan.id} className={`bg-white rounded-3xl p-8 border ${plan.isRecommended ? 'border-rose-500 shadow-xl shadow-rose-100 scale-105 relative z-10' : 'border-slate-100 shadow-lg'}`}>
                         {plan.isRecommended && (
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                                 Mais Escolhido
                             </div>
                         )}
                         <h3 className="text-xl font-bold text-slate-800 text-center">{plan.name}</h3>
                         <div className="text-center my-6">
                             <span className="text-4xl font-black text-slate-900">R$ {plan.price}</span>
                             <span className="text-slate-400 font-medium">/mês</span>
                         </div>
                         <ul className="space-y-4 mb-8">
                             {plan.features.map((feature, i) => (
                                 <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                                     <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                                     {feature}
                                 </li>
                             ))}
                         </ul>
                         <button onClick={() => {
                            const newSlug = `salao-${plan.name.toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
                            const newTenant: Tenant = {
                                id: generateId(), slug: newSlug, ownerName: 'Novo Parceiro', email: 'contato@salao.com', plan: plan.name, status: 'active', mrr: plan.price, createdAt: Date.now()
                            };
                            Storage.addTenant(newTenant);
                            handleNavigateToSalon(newSlug);
                            setTimeout(() => handleAdminLogin(), 100);
                         }} className={`w-full py-3 rounded-xl font-bold transition ${plan.isRecommended ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                             Começar Agora
                         </button>
                     </div>
                 ))}
             </div>
          </section>

          {/* Footer */}
          <footer className="bg-slate-900 text-white py-12 px-6 text-center">
              <p className="text-slate-400 mb-4">&copy; 2024 BelezaApp SaaS. Todos os direitos reservados.</p>
              <button onClick={() => setView(ViewState.SAAS_ADMIN)} className="text-xs text-slate-700 hover:text-slate-500">Área Restrita</button>
          </footer>
      </div>
    );
  };

  const renderMarketplace = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Search Header */}
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar barbearias, salões..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:border-rose-500 focus:ring-rose-500 focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* CTA for Business Owners */}
      <div onClick={() => setView(ViewState.SAAS_LP)} className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer group shadow-lg">
          <div className="relative z-10">
              <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">Para Donos de Salão</span>
              <h3 className="text-xl font-bold mb-1 group-hover:text-rose-400 transition">Cadastre seu negócio</h3>
              <p className="text-sm text-slate-300 mb-4 max-w-xs">Tenha agendamento online, site grátis e gestão completa hoje mesmo.</p>
              <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white transition">Começar Agora</button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition duration-500">
              <Briefcase size={120} />
          </div>
      </div>

      {/* Categories (Mock) */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {['Todos', 'Barbearia', 'Salão', 'Manicure', 'Estética', 'Infantil'].map((cat, i) => (
          <button key={i} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${i === 0 ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Salon List */}
      <div className="grid gap-6">
        {platformSalons.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(salon => (
          <div 
            key={salon.id}
            onClick={() => handleNavigateToSalon(salon.slug, salon)}
            className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition"
          >
            <div className="h-40 w-full overflow-hidden relative">
               <img src={salon.coverUrl} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
               <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-800 shadow-sm">
                  <Star size={12} className="text-amber-400 fill-amber-400" /> {salon.rating}
               </div>
            </div>
            <div className="p-4">
               <div className="flex justify-between items-start mb-2">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">{salon.name}</h3>
                    <p className="text-sm text-slate-500">{salon.category}</p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-rose-500">
                    <ArrowRight size={18} />
                 </div>
               </div>
               <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPinIcon size={12} /> {salon.location}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminDashboard = () => {
    // MEMOIZED DASHBOARD STATS FOR PERFORMANCE
    const dashboardStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaysAppointments = appointments.filter(a => a.date === today && a.status !== 'cancelled');
        const incomeToday = todaysAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
        const nextAppointment = todaysAppointments.filter(a => a.time > new Date().toLocaleTimeString().slice(0,5)).sort((a,b) => a.time.localeCompare(b.time))[0];

        const completedApps = appointments.filter(a => a.status === 'completed');
        const totalRevenue = completedApps.reduce((sum, a) => sum + a.totalPrice, 0);
        const avgTicket = completedApps.length > 0 ? totalRevenue / completedApps.length : 0;
        
        const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
        const totalAppsCount = appointments.length;
        const cancellationRate = totalAppsCount > 0 ? (cancelledCount / totalAppsCount) * 100 : 0;

        // Weekly Flow
        const flowData = new Array(7).fill(0);
        appointments.forEach(a => {
            const date = new Date(a.date);
            const dayIndex = date.getDay(); // 0 (Sun) - 6 (Sat)
            // Just simple week aggregation for demo
            flowData[dayIndex]++;
        });
        const maxFlow = Math.max(...flowData, 1);

        // Top Products
        const productSales: {[key:string]: {count: number, name: string}} = {};
        appointments.forEach(a => {
            if(a.products) {
                a.products.forEach(p => {
                    if(!productSales[p.id]) productSales[p.id] = {count: 0, name: p.name};
                    productSales[p.id].count++;
                });
            }
        });
        const topProducts = Object.values(productSales).sort((a,b) => b.count - a.count).slice(0, 3);
        const todayStr = today.split('-').reverse().join('/');
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        return { todayStr, todaysAppointments, incomeToday, nextAppointment, avgTicket, cancellationRate, flowData, maxFlow, topProducts, weekDays };
    }, [appointments]); // Only recalculate when appointments change

    return (
      <div className="space-y-6 animate-fadeIn">
          {/* Action Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2">
               <button 
                 onClick={() => { setShowLandingPage(true); setView(ViewState.PUBLIC_SALON); }}
                 className="flex-1 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-100 transition whitespace-nowrap"
              >
                 <ExternalLink size={16} /> Ver Loja Online
              </button>
              <button 
                 onClick={() => setView(ViewState.COUPONS)}
                 className="flex-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition whitespace-nowrap"
              >
                 <Ticket size={16} /> Cupons
              </button>
          </div>

         {/* Detailed Stats Row */}
         <div className="grid grid-cols-3 gap-3">
             <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Visualizações</p>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                     <Eye size={14} className="text-blue-500" /> {settings.views || 0}
                 </h3>
             </div>
             <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Ticket Médio</p>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                     <DollarSign size={14} className="text-green-500" /> {dashboardStats.avgTicket.toFixed(0)}
                 </h3>
             </div>
             <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Cancelamentos</p>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                     <AlertCircle size={14} className="text-red-500" /> {dashboardStats.cancellationRate.toFixed(0)}%
                 </h3>
             </div>
         </div>

         {/* Main KPIs */}
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-lg">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p>
               <h3 className="text-2xl font-bold">{dashboardStats.todaysAppointments.length} <span className="text-sm font-normal text-slate-400">agend.</span></h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Faturamento Hoje</p>
               <h3 className="text-2xl font-bold text-green-600">{settings.currency} {dashboardStats.incomeToday}</h3>
            </div>
         </div>

         {/* Charts Section */}
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <BarChart3 size={18} className="text-slate-400" /> Fluxo Semanal
             </h3>
             <div className="flex items-end justify-between h-24 gap-2">
                 {dashboardStats.flowData.map((val, i) => (
                     <div key={i} className="flex flex-col items-center gap-1 w-full">
                         <div 
                            className="w-full bg-rose-100 rounded-t-md relative group hover:bg-rose-200 transition-all"
                            style={{ height: `${(val / dashboardStats.maxFlow) * 100}%`, minHeight: '4px' }}
                         >
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition">{val}</span>
                         </div>
                         <span className="text-[10px] text-slate-400 font-medium">{dashboardStats.weekDays[i]}</span>
                     </div>
                 ))}
             </div>
         </div>

         {/* Top Products */}
         {dashboardStats.topProducts.length > 0 && (
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Trophy size={18} className="text-amber-500" /> Produtos Mais Vendidos
                 </h3>
                 <div className="space-y-4">
                     {dashboardStats.topProducts.map((prod, i) => (
                         <div key={i}>
                             <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                 <span>{prod.name}</span>
                                 <span>{prod.count} un</span>
                             </div>
                             <div className="w-full bg-slate-100 rounded-full h-2">
                                 <div 
                                    className="bg-amber-400 h-2 rounded-full" 
                                    style={{ width: `${(prod.count / dashboardStats.topProducts[0].count) * 100}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* Next Up */}
         {dashboardStats.nextAppointment ? (
            <div className="bg-gradient-to-r from-rose-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">Próximo Cliente</span>
                        <h3 className="text-xl font-bold mt-2">{dashboardStats.nextAppointment.clientName || 'Cliente sem nome'}</h3>
                        <p className="text-white/80 text-sm">{dashboardStats.nextAppointment.serviceName}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-2xl font-bold">{dashboardStats.nextAppointment.time}</p>
                        <p className="text-xs text-white/60">Hoje</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button className="flex-1 bg-white text-rose-600 py-2 rounded-lg font-bold text-xs shadow-sm">Iniciar Atendimento</button>
                     <button className="px-3 bg-white/20 rounded-lg text-white font-bold hover:bg-white/30"><Phone size={16} /></button>
                  </div>
               </div>
               <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                  <Clock size={120} />
               </div>
            </div>
         ) : (
             <div className="bg-slate-50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Sem próximos agendamentos hoje</p>
             </div>
         )}

         {/* Today's List */}
         <div>
            <h3 className="font-bold text-slate-800 mb-3 flex justify-between items-center">
               Agenda de Hoje 
               <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{dashboardStats.todayStr}</span>
            </h3>
            <div className="space-y-3">
               {dashboardStats.todaysAppointments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Nenhum agendamento para hoje.</p>
               ) : (
                  dashboardStats.todaysAppointments.sort((a,b) => a.time.localeCompare(b.time)).map(app => (
                     <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="bg-slate-50 font-bold text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200">
                              {app.time}
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-sm">{app.clientName}</p>
                              <p className="text-xs text-slate-500">{app.serviceName} • {app.employeeName}</p>
                              {app.products && app.products.length > 0 && (
                                 <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1 mt-0.5">
                                    <ShoppingBag size={10} /> + {app.products.length} produtos
                                 </p>
                              )}
                           </div>
                        </div>
                        <button onClick={() => initiateCancelAppointment(app.id)} className="text-slate-300 hover:text-red-500 p-2">
                           <X size={18} />
                        </button>
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>
    );
  };

  const renderFinanceDashboard = () => {
    const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const pendingIncome = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

    return (
      <div className="space-y-6 animate-fadeIn pb-20">
         <div className="grid grid-cols-2 gap-4">
             <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                 <p className="text-xs font-bold text-green-600 uppercase mb-1">Receitas</p>
                 <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-1"><TrendingUp size={18} className="text-green-500"/> {totalIncome}</h3>
             </div>
             <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                 <p className="text-xs font-bold text-red-600 uppercase mb-1">Despesas</p>
                 <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-1"><TrendingDown size={18} className="text-red-500"/> {totalExpense}</h3>
             </div>
         </div>
         
         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
             <div>
                 <p className="text-xs text-slate-400 font-bold uppercase">Saldo Líquido</p>
                 <h3 className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                     {settings.currency} {(totalIncome - totalExpense).toFixed(2)}
                 </h3>
             </div>
             <div className="text-right">
                 <p className="text-xs text-slate-400 font-bold uppercase">A Receber</p>
                 <p className="text-sm font-bold text-amber-500">{settings.currency} {pendingIncome.toFixed(2)}</p>
             </div>
         </div>

         <div>
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-800">Transações</h3>
                 <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="text-xs bg-slate-900 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1">
                     <Plus size={14} /> Nova
                 </button>
             </div>
             
             <div className="space-y-3">
                 {transactions.length === 0 ? (
                     <p className="text-center text-slate-400 text-sm py-4">Nenhuma transação registrada.</p>
                 ) : (
                     transactions.slice().reverse().map(t => (
                         <div key={t.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                     {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                 </div>
                                 <div>
                                     <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                                     <p className="text-xs text-slate-500 capitalize">{t.category} • {t.date.split('-').reverse().join('/')}</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                     {t.type === 'income' ? '+' : '-'} {t.amount}
                                 </p>
                                 <div className="flex items-center justify-end gap-2">
                                     <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.status === 'paid' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
                                         {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                     </span>
                                     <button onClick={() => handleDelete(t.id, 'transaction')} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                 </div>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </div>
      </div>
    );
  };

  const renderCoupons = () => (
      <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
               <h3 className="font-bold text-lg text-slate-800">Cupons de Desconto</h3>
               <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 transition flex items-center gap-2">
                  <Plus size={16} /> Criar Cupom
               </button>
          </div>
          
          {coupons.length === 0 ? (
              <EmptyState icon={Ticket} title="Sem cupons" description="Crie campanhas de desconto." />
          ) : (
              <div className="grid gap-4">
                  {coupons.map(c => (
                      <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-purple-600"></div>
                          <div>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Código</p>
                              <h3 className="text-xl font-black text-slate-800 tracking-wide">{c.code}</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                 {c.type === 'percent' ? `${c.discount}% OFF` : `${settings.currency} ${c.discount} OFF`} • {c.usageCount} usos
                              </p>
                          </div>
                          <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                   {c.active ? 'Ativo' : 'Inativo'}
                               </div>
                               <button onClick={() => handleDelete(c.id, 'coupon')} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderLandingPage = () => {
    if (!currentSalonMetadata) return <div className="p-10 text-center">Carregando...</div>;
    return (
      <div className="animate-fadeIn -m-4 pb-20">
          <div className="relative h-64 w-full">
              <img src={currentSalonMetadata.coverUrl} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                  <div className="flex justify-between items-end">
                      <div>
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                              {currentSalonMetadata.category}
                          </span>
                          <h1 className="text-3xl font-bold mb-1">{currentSalonMetadata.name}</h1>
                          <p className="text-white/80 text-sm flex items-center gap-1">
                              <MapPinIcon size={14} /> {currentSalonMetadata.location}
                          </p>
                      </div>
                      <div className="text-right">
                           <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                               <Star size={16} className="text-amber-400 fill-amber-400" />
                               <span className="font-bold">{currentSalonMetadata.rating}</span>
                           </div>
                           {/* CADEADO DO DONO DO SALÃO (RECOLOCADO CONFORME PEDIDO) */}
                           <button onClick={() => setIsLoginModalOpen(true)} className="mt-2 bg-white/20 p-2 rounded-full text-white hover:bg-white/30 backdrop-blur-md shadow-md">
                               <Lock size={16}/>
                           </button>
                      </div>
                  </div>
              </div>
              
              <button onClick={() => handleBackToMarketplace()} className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition">
                  <ArrowLeft size={24} />
              </button>
              <button className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition">
                  <Share2 size={24} />
              </button>
          </div>

          <div className="p-6 bg-white rounded-t-3xl -mt-6 relative z-10 space-y-8">
               <div className="flex justify-around border-b border-slate-100 pb-6">
                   <div className="text-center">
                       <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2"><Scissors size={20} /></div>
                       <p className="text-xs font-bold text-slate-700">Serviços</p>
                   </div>
                   <div className="text-center">
                       <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={20} /></div>
                       <p className="text-xs font-bold text-slate-700">Equipe</p>
                   </div>
                    <div className="text-center">
                       <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2"><MapPinIcon size={20} /></div>
                       <p className="text-xs font-bold text-slate-700">Local</p>
                   </div>
               </div>

               <div>
                   <h3 className="font-bold text-lg text-slate-800 mb-4">Sobre</h3>
                   <p className="text-slate-500 text-sm leading-relaxed">
                       Bem-vindo ao {currentSalonMetadata.name}. Oferecemos os melhores serviços de {currentSalonMetadata.category} da região de {currentSalonMetadata.location}. 
                       Nossa equipe é especializada e o ambiente é preparado para seu conforto.
                   </p>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-xl">
                   <h3 className="font-bold text-sm text-slate-800 mb-2">Horário de Funcionamento</h3>
                   <div className="flex justify-between text-sm text-slate-500">
                       <span>Segunda - Sexta</span>
                       <span className="font-medium text-slate-700">{settings.openTime} - {settings.closeTime}</span>
                   </div>
                   <div className="flex justify-between text-sm text-slate-500 mt-1">
                       <span>Sábado</span>
                       <span className="font-medium text-slate-700">09:00 - 18:00</span>
                   </div>
               </div>
          </div>

          <div className="fixed bottom-20 left-4 right-4 z-40 md:max-w-3xl md:mx-auto">
              <button 
                  onClick={() => { setShowLandingPage(false); setIsBookingMode(true); }}
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-rose-200/50 hover:bg-rose-700 transition flex items-center justify-center gap-2"
              >
                  <Calendar size={20} />
                  Agendar Horário
              </button>
          </div>
      </div>
    );
  };

  const renderClientView = () => {
    if (!currentUser && !isBookingMode) return renderClientAuth();

    // Booking Wizard
    if (isBookingMode) {
        return (
            <div className="animate-fadeIn pb-24">
                <div className="mb-6 flex items-center gap-4">
                    <button onClick={() => { if(bookingStep > 0) setBookingStep(bookingStep-1); else setIsBookingMode(false); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {bookingStep === 0 && 'Escolha o Serviço'}
                            {bookingStep === 1 && 'Escolha o Profissional'}
                            {bookingStep === 2 && 'Data e Hora'}
                            {bookingStep === 3 && 'Confirmar'}
                        </h2>
                        <div className="flex gap-1 mt-1">
                            {[0,1,2,3].map(step => (
                                <div key={step} className={`h-1 w-8 rounded-full ${step <= bookingStep ? 'bg-rose-600' : 'bg-slate-200'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                {bookingStep === 0 && (
                     <div className="space-y-3 pb-24">
                         {services.map(s => {
                             const isSelected = selectedService?.id === s.id;
                             return (
                             <div key={s.id} onClick={() => setSelectedService(s)} className={`bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer transition group ${isSelected ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50' : 'border-slate-100 hover:border-rose-300'}`}>
                                 <div>
                                     <h3 className="font-bold text-slate-800">{s.name}</h3>
                                     <p className="text-xs text-slate-500">{s.duration} min • {s.description}</p>
                                 </div>
                                 <span className="font-bold text-slate-800">{settings.currency} {s.price}</span>
                             </div>
                             )
                         })}
                         
                         {/* Product Add-ons in Step 0 */}
                         <div className="mt-8">
                             <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <ShoppingBag size={18} className="text-rose-500" /> Adicionar Produtos
                             </h3>
                             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                 {products.map(p => {
                                     const qty = getCartCount(p.id);
                                     const isOutOfStock = p.stock <= 0;
                                     return (
                                     <div key={p.id} className="min-w-[140px] bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col">
                                         <div className="h-20 bg-slate-100 rounded-lg mb-2 overflow-hidden relative">
                                             {p.photoUrl && <img src={p.photoUrl} className="w-full h-full object-cover"/>}
                                             {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold uppercase">Esgotado</div>}
                                         </div>
                                         <p className="font-bold text-xs truncate">{p.name}</p>
                                         <p className="text-xs text-slate-500 mb-2">{settings.currency} {p.price}</p>
                                         {!isOutOfStock && (
                                              qty === 0 ? (
                                                  <button onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }} className="mt-auto bg-slate-900 text-white text-[10px] py-1.5 rounded-lg font-bold">Adicionar</button>
                                              ) : (
                                                  <div className="mt-auto flex items-center justify-between bg-rose-50 rounded-lg p-1">
                                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveOneFromCart(p.id); }} className="p-0.5 text-rose-600"><Minus size={14}/></button>
                                                      <span className="text-xs font-bold text-rose-700">{qty}</span>
                                                      <button onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }} className="p-0.5 text-rose-600"><Plus size={14}/></button>
                                                  </div>
                                              )
                                         )}
                                     </div>
                                     )
                                 })}
                             </div>
                         </div>
                     </div>
                )}
                
                {/* Fixed Continue Button for Step 0 */}
                {bookingStep === 0 && selectedService && (
                    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50 md:max-w-3xl md:mx-auto">
                        <button 
                            onClick={() => setBookingStep(1)}
                            className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition flex justify-between px-6"
                        >
                            <span>Continuar</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                {settings.currency} { (selectedService.price + cart.reduce((a,b) => a + b.price, 0)).toFixed(2) }
                            </span>
                        </button>
                    </div>
                )}

                {bookingStep === 1 && (
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => { setSelectedEmployee(null); setBookingStep(2); }} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-rose-300 transition text-center flex flex-col items-center justify-center min-h-[160px]">
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-3"><Users size={24}/></div>
                            <h3 className="font-bold text-slate-800 text-sm">Qualquer Profissional</h3>
                            <p className="text-xs text-slate-400 mt-1">Maior disponibilidade</p>
                        </div>
                        {employees.map(e => (
                             <div key={e.id} onClick={() => { setSelectedEmployee(e); setBookingStep(2); }} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-rose-300 transition text-center flex flex-col items-center">
                                 <div className="w-16 h-16 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                     {e.photoUrl ? <img src={e.photoUrl} className="w-full h-full object-cover"/> : <User className="w-full h-full p-4 text-slate-400"/>}
                                 </div>
                                 <h3 className="font-bold text-slate-800 text-sm">{e.name}</h3>
                                 <p className="text-xs text-slate-400 mt-1">{e.role}</p>
                             </div>
                        ))}
                    </div>
                )}

                {bookingStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Selecione a Data</label>
                            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                                {Array.from({length: 14}).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + i);
                                    const isSelected = d.toISOString().split('T')[0] === selectedDate;
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => setSelectedDate(d.toISOString().split('T')[0])}
                                            className={`min-w-[60px] p-3 rounded-xl border flex flex-col items-center transition ${isSelected ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'}`}
                                        >
                                            <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('pt-BR', {weekday: 'short'}).replace('.','')}</span>
                                            <span className="text-lg font-bold">{d.getDate()}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Horários Disponíveis</label>
                            <div className="grid grid-cols-4 gap-3">
                                {['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(time => (
                                    <button 
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-2 rounded-lg text-sm font-bold border transition ${selectedTime === time ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'}`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <button 
                            disabled={!selectedTime}
                            onClick={() => setBookingStep(3)}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {bookingStep === 3 && selectedService && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="text-center border-b border-slate-100 pb-6">
                             <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                 <CheckCircle2 size={32} />
                             </div>
                             <h3 className="text-xl font-bold text-slate-800">Confirmar Agendamento</h3>
                             <p className="text-slate-500 text-sm">Revise os detalhes abaixo</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">Serviço</span>
                                <span className="font-bold text-slate-800">{selectedService.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">Profissional</span>
                                <span className="font-bold text-slate-800">{selectedEmployee?.name || 'Preferência do Salão'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">Data e Hora</span>
                                <span className="font-bold text-slate-800">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                            </div>
                            {cart.length > 0 && (
                                <div className="border-t border-dashed border-slate-200 pt-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Produtos Adicionais</p>
                                    {cart.map(p => (
                                        <div key={p.id} className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">{p.name}</span>
                                            <span className="font-medium text-slate-800">{settings.currency} {p.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Coupon Input */}
                        <div className="bg-slate-50 p-3 rounded-xl flex gap-2">
                             <input 
                                type="text" 
                                placeholder="CUPOM DE DESCONTO" 
                                className="flex-1 bg-transparent border-none text-sm font-bold uppercase focus:ring-0 placeholder:text-slate-400"
                                value={couponCodeInput}
                                onChange={e => setCouponCodeInput(e.target.value)}
                             />
                             <button onClick={handleApplyCoupon} className="text-rose-600 text-xs font-bold">APLICAR</button>
                        </div>
                        {appliedCoupon && (
                            <p className="text-green-600 text-xs font-bold text-center">
                                Cupom {appliedCoupon.code} aplicado! (- {appliedCoupon.type === 'percent' ? `${appliedCoupon.discount}%` : `R$ ${appliedCoupon.discount}`})
                            </p>
                        )}

                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                            <span className="font-bold text-slate-500">Total</span>
                            <span className="text-2xl font-black text-rose-600">
                                {settings.currency} { 
                                    (
                                      (selectedService.price + cart.reduce((a,b)=>a+b.price,0)) - 
                                      (appliedCoupon ? (appliedCoupon.type === 'fixed' ? appliedCoupon.discount : (selectedService.price + cart.reduce((a,b)=>a+b.price,0)) * appliedCoupon.discount / 100) : 0)
                                    ).toFixed(2) 
                                }
                            </span>
                        </div>

                        <button 
                            onClick={handleConfirmBooking}
                            className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition"
                        >
                            Confirmar Agendamento
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    // Client Dashboard (Logged In)
    return (
        <div className="animate-fadeIn space-y-6 pb-20">
             <div className="flex justify-between items-center">
                 <div>
                     <h2 className="text-xl font-bold text-slate-800">Olá, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Cliente'}</h2>
                     <p className="text-sm text-slate-500">Bem-vindo de volta!</p>
                 </div>
                 <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-red-500">Sair</button>
             </div>

             <div className="bg-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-200 relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Próximo Agendamento</p>
                      {appointments.filter(a => a.clientId === currentUser?.id && a.status === 'scheduled').length > 0 ? (
                          (() => {
                              const next = appointments.filter(a => a.clientId === currentUser?.id && a.status === 'scheduled').sort((a,b) => a.date.localeCompare(b.date))[0];
                              return (
                                  <div>
                                      <h3 className="text-2xl font-bold mb-1">{next.serviceName}</h3>
                                      <p className="text-white/90 text-sm mb-4">{next.date.split('-').reverse().join('/')} às {next.time} • com {next.employeeName}</p>
                                      <button onClick={() => alert('Função de reagendar em breve')} className="bg-white text-rose-600 px-4 py-2 rounded-lg text-xs font-bold">Gerenciar</button>
                                  </div>
                              )
                          })()
                      ) : (
                          <div>
                              <p className="text-lg font-bold mb-4">Nenhum agendamento futuro.</p>
                              <button onClick={() => setIsBookingMode(true)} className="bg-white text-rose-600 px-4 py-2 rounded-lg text-xs font-bold">Agendar Agora</button>
                          </div>
                      )}
                  </div>
                  <CalendarDays className="absolute right-4 bottom-4 opacity-20 text-white" size={80} />
             </div>

             <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Histórico</h3>
                    <button onClick={() => setIsBookingMode(true)} className="text-rose-600 font-bold text-sm flex items-center gap-1"><Plus size={16}/> Novo Agendamento</button>
                 </div>
                 <div className="space-y-3">
                     {appointments.filter(a => a.clientId === currentUser?.id).length === 0 ? (
                         <p className="text-slate-400 text-sm text-center py-6">Seu histórico aparecerá aqui.</p>
                     ) : (
                         appointments.filter(a => a.clientId === currentUser?.id).sort((a,b) => b.createdAt - a.createdAt).map(app => (
                             <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                                 <div>
                                     <h4 className="font-bold text-slate-800">{app.serviceName}</h4>
                                     <p className="text-xs text-slate-500">{app.date.split('-').reverse().join('/')} • {app.time}</p>
                                 </div>
                                 <div>
                                     <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${app.status === 'completed' ? 'bg-green-100 text-green-700' : app.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                         {app.status === 'completed' ? 'Concluído' : app.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                                     </span>
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>
        </div>
    );
  };

  const clientTab = (view === ViewState.CLIENT_STORE) ? 'store' : (showLandingPage ? 'home' : 'appointments');

  return (
    <Layout 
        currentView={view} 
        setView={setView} 
        salonName={settings.shopName}
        activeClientTab={clientTab}
        onClientTabChange={(tab) => {
            if (tab === 'home') {
                setShowLandingPage(true);
                setView(ViewState.PUBLIC_SALON);
                setIsBookingMode(false);
            } else if (tab === 'store') {
                setView(ViewState.CLIENT_STORE);
                setShowLandingPage(false);
                setIsBookingMode(false);
            } else {
                setView(ViewState.PUBLIC_SALON);
                setShowLandingPage(false);
                setIsBookingMode(false);
            }
        }}
    >
      
      {view === ViewState.MARKETPLACE && renderMarketplace()}
      {view === ViewState.SAAS_LP && renderSaaSLandingPage()}
      {view === ViewState.SAAS_ADMIN && renderSaaSAdmin()}
      {view === ViewState.SAAS_PLANS && renderSaasPlans()}
      
      {view === ViewState.DASHBOARD && renderAdminDashboard()}
      {view === ViewState.FINANCE && renderFinanceDashboard()}
      {view === ViewState.COUPONS && renderCoupons()}

      {view === ViewState.CLIENT_AUTH && renderClientAuth()}
      {view === ViewState.CLIENT_STORE && renderClientStore()}

      {(view === ViewState.CLIENT_PREVIEW || view === ViewState.PUBLIC_SALON) && (
        showLandingPage && view === ViewState.PUBLIC_SALON 
          ? renderLandingPage() 
          : (!currentUser
              // Intercept Client View to show Auth if not logged in and trying to book/view dashboard
              ? (isBookingMode ? renderClientAuth() : renderClientView()) 
              : renderClientView())
      )}

      {/* Admin Views */}
      {view === ViewState.SERVICES && (
        <>
          {services.length === 0 ? (
            <EmptyState icon={Scissors} title="Sem serviços" description="Adicione serviços." action={ <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="mt-4 bg-rose-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-rose-700 transition flex items-center gap-2"> <Plus size={20} /> Adicionar Serviço </button> } />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map(service => ( <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start"> <div> <h3 className="font-bold text-slate-800">{service.name}</h3> <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.description}</p> <div className="flex items-center gap-3 mt-3"> <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium flex items-center gap-1"> <Clock size={12} /> {service.duration} min </span> <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold flex items-center gap-1"> <DollarSign size={12} /> {service.price} </span> </div> </div> <button onClick={() => handleDelete(service.id, 'service')} className="text-slate-300 hover:text-red-500 p-2"> <Trash2 size={18} /> </button> </div> ))}
            </div>
          )}
          <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="fixed bottom-24 right-6 bg-rose-600 text-white p-4 rounded-full shadow-lg hover:bg-rose-700 transition z-10"> <Plus size={24} /> </button>
        </>
      )}

      {view === ViewState.PRODUCTS && (
        <>
           {products.length === 0 ? ( <EmptyState icon={Package} title="Estoque vazio" description="Cadastre produtos." action={ <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="mt-4 bg-rose-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-rose-700 transition flex items-center gap-2"> <Plus size={20} /> Adicionar Produto </button> } /> ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map(product => ( <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start"> <div className="flex gap-3"> <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0"> {product.photoUrl ? ( <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div> )} </div> <div> <h3 className="font-bold text-slate-800">{product.name}</h3> <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p> <div className="flex items-center gap-3 mt-2"> <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium flex items-center gap-1"> <Box size={12} /> {product.stock} un </span> <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold flex items-center gap-1"> <DollarSign size={12} /> {product.price} </span> </div> </div> </div> <button onClick={() => handleDelete(product.id, 'product')} className="text-slate-300 hover:text-red-500 p-2"> <Trash2 size={18} /> </button> </div> ))}
            </div>
          )}
          <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="fixed bottom-24 right-6 bg-rose-600 text-white p-4 rounded-full shadow-lg hover:bg-rose-700 transition z-10"> <Plus size={24} /> </button>
        </>
      )}

      {view === ViewState.TEAM && (
        <>
           {employees.length === 0 ? ( <EmptyState icon={Users} title="Sem equipe" description="Cadastre profissionais." action={ <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="mt-4 bg-rose-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-rose-700 transition flex items-center gap-2"> <Plus size={20} /> Adicionar Membro </button> } /> ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {employees.map(emp => ( <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4"> <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-white shadow-sm"> {emp.photoUrl ? ( <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" /> ) : ( <User className="w-full h-full p-4 text-slate-400" /> )} </div> <div className="flex-1"> <h3 className="font-bold text-slate-800">{emp.name}</h3> <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">{emp.role}</p> </div> <button onClick={() => handleDelete(emp.id, 'employee')} className="text-slate-300 hover:text-red-500 p-2"> <Trash2 size={18} /> </button> </div> ))}
            </div>
          )}
           <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="fixed bottom-24 right-6 bg-rose-600 text-white p-4 rounded-full shadow-lg hover:bg-rose-700 transition z-10"> <Plus size={24} /> </button>
        </>
      )}

      {view === ViewState.SETTINGS && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
           <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">Configurações do Salão</h3>
           <div className="grid gap-4"> <div> <label className="block text-sm font-medium text-slate-700">Nome do Salão</label> <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border" value={settings.shopName} onChange={e => setSettings({ ...settings, shopName: e.target.value })} /> </div> <div> <label className="block text-sm font-medium text-slate-700">Endereço Público</label> <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border" value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} /> </div> <div> <label className="block text-sm font-medium text-slate-700">Telefone de Contato</label> <input type="tel" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })} /> </div> </div>
           <button onClick={() => { Storage.saveSettings(settings); alert('Salvo!'); }} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition mt-4"> Salvar Configurações </button>
           
           <div className="pt-6 border-t border-slate-100">
                <button onClick={handleAdminLogout} className="w-full flex items-center justify-center gap-2 text-red-600 font-bold py-3 rounded-xl bg-red-50 hover:bg-red-100 transition">
                     <LogOut size={20} /> Sair da Administração
                </button>
           </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                  {view === ViewState.FINANCE && 'Nova Transação'}
                  {view === ViewState.COUPONS && (editingItem?.id ? 'Editar Cupom' : 'Novo Cupom')}
                  {view === ViewState.SERVICES && (editingItem?.id ? 'Editar Serviço' : 'Novo Serviço')}
                  {view === ViewState.PRODUCTS && (editingItem?.id ? 'Editar Produto' : 'Novo Produto')}
                  {view === ViewState.TEAM && (editingItem?.id ? 'Editar Profissional' : 'Novo Profissional')}
                  {view === ViewState.SAAS_PLANS && (editingItem?.id ? 'Editar Plano' : 'Novo Plano SaaS')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"> <X size={24} /> </button>
              </div>
              
              {view === ViewState.SERVICES && renderServiceForm()}
              {view === ViewState.PRODUCTS && renderProductForm()}
              {view === ViewState.TEAM && renderEmployeeForm()}
              
              {/* Transaction Form */}
              {view === ViewState.FINANCE && (
                   <form onSubmit={handleSaveTransaction} className="space-y-4">
                       <div> <label className="block text-sm font-medium text-slate-700">Descrição</label> <input type="text" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.title || ''} onChange={e => setEditingItem({...editingItem as Transaction, title: e.target.value})} /> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Valor</label> <input type="number" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.amount || ''} onChange={e => setEditingItem({...editingItem as Transaction, amount: parseFloat(e.target.value)})} /> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Tipo</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.type || 'expense'} onChange={e => setEditingItem({...editingItem as Transaction, type: e.target.value as any})}> <option value="expense">Despesa</option> <option value="income">Receita</option> </select> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Status</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.status || 'paid'} onChange={e => setEditingItem({...editingItem as Transaction, status: e.target.value as any})}> <option value="paid">Pago / Recebido</option> <option value="pending">Pendente / A Receber</option> </select> </div>
                       <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Salvar</button>
                   </form>
              )}
              {/* Coupon Form */}
              {view === ViewState.COUPONS && (
                   <form onSubmit={handleSaveCoupon} className="space-y-4">
                       <div> <label className="block text-sm font-medium text-slate-700">Código do Cupom</label> <input type="text" required className="mt-1 block w-full p-2 border rounded-md uppercase" placeholder="Ex: BEMVINDO10" value={(editingItem as Coupon)?.code || ''} onChange={e => setEditingItem({...editingItem as Coupon, code: e.target.value})} /> </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div> <label className="block text-sm font-medium text-slate-700">Tipo</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Coupon)?.type || 'fixed'} onChange={e => setEditingItem({...editingItem as Coupon, type: e.target.value as any})}> <option value="fixed">Fixo (R$)</option> <option value="percent">Porcentagem (%)</option> </select> </div>
                           <div> <label className="block text-sm font-medium text-slate-700">Valor Desconto</label> <input type="number" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Coupon)?.discount || ''} onChange={e => setEditingItem({...editingItem as Coupon, discount: parseFloat(e.target.value)})} /> </div>
                       </div>
                       <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Salvar Cupom</button>
                   </form>
              )}
              {/* SaaS Plan Form */}
              {view === ViewState.SAAS_PLANS && (
                  <form onSubmit={handleSavePlan} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nome do Plano</label>
                          <input type="text" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as any)?.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value} as any)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Preço Mensal (R$)</label>
                          <input type="number" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as any)?.price || ''} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)} as any)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Benefícios (separados por vírgula)</label>
                          <textarea className="mt-1 block w-full p-2 border rounded-md" rows={4} value={(editingItem as any)?.features || ''} onChange={e => setEditingItem({...editingItem, features: e.target.value} as any)} />
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="isRecommended" checked={(editingItem as any)?.isRecommended || false} onChange={e => setEditingItem({...editingItem, isRecommended: e.target.checked} as any)} />
                          <label htmlFor="isRecommended" className="text-sm font-medium text-slate-700">Marcar como Recomendado</label>
                      </div>
                      <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Salvar Plano</button>
                  </form>
              )}

            </div>
          </div>
        </div>
      )}

      {isLoginModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scaleIn p-8 text-center">
               <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"> <LogIn size={32} /> </div>
               <h3 className="text-2xl font-bold text-slate-800 mb-2">Área do Parceiro</h3>
               <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }}> <input type="email" placeholder="E-mail" className="w-full p-3 border border-slate-200 rounded-xl mb-3" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /> <input type="password" placeholder="Senha" className="w-full p-3 border border-slate-200 rounded-xl mb-6" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /> <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold">Entrar</button> </form>
               <div className="mt-6 pt-4 border-t border-slate-100"> <button onClick={fillDemoLogin} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-center gap-2"> <KeyRound size={14} /> Usar Credenciais de Teste </button> </div>
               <button onClick={() => setIsLoginModalOpen(false)} className="mt-4 text-sm text-slate-400 hover:text-slate-600">Cancelar</button>
            </div>
         </div>
      )}

      {appointmentToCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
           <div className="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-xl animate-scaleIn">
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"> <AlertCircle size={24} /> </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Cancelar Agendamento?</h3>
              <p className="text-sm text-slate-500 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3"> <button onClick={() => setAppointmentToCancel(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg">Voltar</button> <button onClick={confirmCancellation} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg shadow-md">Sim, Cancelar</button> </div>
           </div>
        </div>
      )}

    </Layout>
  );
};

export default App;
