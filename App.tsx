
import React, { useState, useEffect } from 'react';
import { ViewState, Service, Product, Employee, ShopSettings, Appointment, SalonMetadata, Client, Transaction, Coupon } from './types';
import * as Storage from './services/storage';
import * as Gemini from './services/gemini';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { Plus, Trash2, Wand2, Clock, DollarSign, Box, CheckCircle2, Scissors, Package, Users, Phone, Calendar, ChevronLeft, User, Image as ImageIcon, X, CalendarDays, AlertCircle, Star, Search, MapPin as MapPinIcon, ArrowRight, ArrowLeft, Share2, ShoppingBag, TrendingUp, Wallet, LogIn, Eye, BarChart3, Trophy, KeyRound, Ticket, TrendingDown, Lock, Pencil, ExternalLink, LogOut, Minus } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.MARKETPLACE);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(Storage.getSettings());
  
  // Financial & Client State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentUser, setCurrentUser] = useState<Client | null>(null);

  // Marketplace State
  const [platformSalons, setPlatformSalons] = useState<SalonMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
  
  const [editingItem, setEditingItem] = useState<Partial<Service | Product | Employee | Transaction | Coupon> | null>(null);
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
    // 1. Load Marketplace Data
    const allSalons = Storage.getPlatformSalons();
    setPlatformSalons(allSalons);

    // 2. Check URL Params for deep linking
    const urlParams = new URLSearchParams(window.location.search);
    const salonSlug = urlParams.get('salon');
    const isAdmin = urlParams.get('admin');

    if (isAdmin) {
      handleAdminLogin();
    } else if (salonSlug) {
      const metadata = allSalons.find(s => s.slug === salonSlug);
      if (metadata) {
        handleNavigateToSalon(salonSlug, metadata, false);
      } else {
        setView(ViewState.MARKETPLACE);
      }
    } else {
      setView(ViewState.MARKETPLACE);
    }

    // Handle Browser Back Button
    const handlePopState = () => {
       const params = new URLSearchParams(window.location.search);
       const slug = params.get('salon');
       if (slug) {
         const meta = allSalons.find(s => s.slug === slug);
         if (meta) handleNavigateToSalon(slug, meta, false);
       } else {
         handleBackToMarketplace(false);
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
          setView(ViewState.MARKETPLACE);
          setCurrentSalonMetadata(null); // Clear context
          window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
      }
  };

  const handleAdminLogin = () => {
    // If we are NOT in a specific salon (i.e. Marketplace), switch to demo admin.
    // If we ARE in a salon (currentSalonMetadata is set), we assume we are logging into THIS salon.
    if (!currentSalonMetadata) {
        const adminNamespace = 'admin_demo_account';
        Storage.setCurrentNamespace(adminNamespace);
    }
    // Else: we keep the current namespace (e.g. 'barbearia-vintage') so the owner manages THEIR salon.

    // Seed data if empty (works for both new salons or the demo account)
    const currentServices = Storage.getServices();
    if (currentServices.length === 0) {
        Storage.saveServices(Storage.getServices()); // Will load defaults from storage.ts if empty
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
    setShowLandingPage(false); // Hide LP when going to Dashboard
    setIsLoginModalOpen(false);
    setLoginEmail('');
    setLoginPassword('');
    // We do NOT change the URL if we are managing a specific salon, to keep context.
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
    if (!editingItem || !editingItem.name) return;
    const item = editingItem as Service;
    const newItem: Service = { ...item, id: item.id || generateId(), duration: item.duration || 30 };
    const updated = item.id ? services.map(s => s.id === newItem.id ? newItem : s) : [...services, newItem];
    setServices(updated);
    Storage.saveServices(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name) return;
    const item = editingItem as Product;
    const newItem: Product = { ...item, id: item.id || generateId(), price: item.price || 0, stock: item.stock || 0 };
    const updated = item.id ? products.map(p => p.id === newItem.id ? newItem : p) : [...products, newItem];
    setProducts(updated);
    Storage.saveProducts(updated);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name) return;
    const item = editingItem as Employee;
    const newItem: Employee = { ...item, id: item.id || generateId(), role: item.role || 'Profissional' };
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

  const handleDelete = (id: string, type: 'service' | 'product' | 'employee' | 'transaction' | 'coupon') => {
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
      }
    }
  };

  // --- AI HANDLERS ---
  const handleGenerateDescription = async () => {
    if (!editingItem?.name) return alert('Digite o nome primeiro');
    setIsLoadingAI(true);
    let type: 'service' | 'product' | 'employee' = 'service';
    let extraInfo = '';
    if (view === ViewState.PRODUCTS) type = 'product';
    if (view === ViewState.TEAM) { type = 'employee'; extraInfo = (editingItem as Employee).role || ''; }
    const desc = await Gemini.generateDescription(editingItem.name, type, extraInfo);
    setEditingItem(prev => ({ ...prev, description: desc }));
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
            setEditingItem(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg', 0.8) }));
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
          status: 'completed', // Auto-complete for pickup or leave scheduled? 'completed' effectively means 'order placed' here for simplicity, or use 'scheduled' to show in active list
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
            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
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
          onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Duração (min)</label>
        <input
          type="number"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Service)?.duration || ''}
          onChange={e => setEditingItem({ ...editingItem, duration: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Descrição</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Service)?.description || ''}
          onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
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
            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
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
            onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estoque</label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
            value={(editingItem as Product)?.stock || ''}
            onChange={e => setEditingItem({ ...editingItem, stock: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Descrição</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Product)?.description || ''}
          onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
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
            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
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
          onChange={e => setEditingItem({ ...editingItem, role: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Bio</label>
        <textarea
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 border"
          value={(editingItem as Employee)?.bio || ''}
          onChange={e => setEditingItem({ ...editingItem, bio: e.target.value })}
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

  const renderFinanceDashboard = () => {
      // Calculate totals
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;
      const pendingIncome = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

      return (
          <div className="animate-fadeIn space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Atual</p>
                       <h3 className="text-3xl font-bold">{settings.currency} {balance.toFixed(2)}</h3>
                       <div className="absolute right-0 top-0 p-4 opacity-10"><Wallet size={64} /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-2 md:col-span-2">
                       <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                           <div className="flex items-center gap-2 mb-2 text-green-600">
                               <TrendingUp size={18} /> <span className="text-xs font-bold uppercase">Receitas</span>
                           </div>
                           <p className="text-xl font-bold text-green-700">{settings.currency} {totalIncome.toFixed(2)}</p>
                           <p className="text-xs text-green-500 mt-1">Previsto: {settings.currency} {pendingIncome.toFixed(2)}</p>
                       </div>
                       <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                           <div className="flex items-center gap-2 mb-2 text-red-600">
                               <TrendingDown size={18} /> <span className="text-xs font-bold uppercase">Despesas</span>
                           </div>
                           <p className="text-xl font-bold text-red-700">{settings.currency} {totalExpense.toFixed(2)}</p>
                       </div>
                   </div>
              </div>

              {/* Transaction List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">Extrato</h3>
                      <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="text-rose-600 text-xs font-bold flex items-center gap-1">
                          <Plus size={14} /> Lançar
                      </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                      {transactions.slice().reverse().map(t => (
                          <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-slate-800">{t.title}</p>
                                      <div className="flex gap-2 text-xs text-slate-400">
                                          <span>{new Date(t.date).toLocaleDateString()}</span>
                                          <span className="capitalize">• {t.status === 'pending' ? 'Pendente' : 'Pago'}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {t.type === 'income' ? '+' : '-'} {settings.currency} {t.amount}
                                  </p>
                                  {t.status === 'pending' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">Previsto</span>}
                              </div>
                          </div>
                      ))}
                      {transactions.length === 0 && <p className="p-6 text-center text-slate-400 text-sm">Nenhuma transação registrada.</p>}
                  </div>
              </div>
          </div>
      );
  };

  const renderCoupons = () => (
      <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Cupons de Desconto</h2>
                  <p className="text-slate-500 text-sm">Gerencie promoções</p>
              </div>
              <button onClick={() => setView(ViewState.DASHBOARD)} className="text-sm text-slate-500 hover:underline">Voltar</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
              {coupons.map(c => (
                  <div key={c.id} className={`p-4 rounded-xl border flex justify-between items-center ${c.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <Ticket size={16} className="text-rose-500" />
                              <h3 className="font-bold text-lg text-slate-800 tracking-wider">{c.code}</h3>
                          </div>
                          <p className="text-sm text-slate-500">
                              {c.type === 'percent' ? `${c.discount}% OFF` : `${settings.currency} ${c.discount} OFF`}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Usado {c.usageCount} vezes</p>
                      </div>
                      <div className="flex gap-2">
                           <button onClick={() => { setEditingItem(c); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-500 p-2">
                               <Pencil size={18} />
                           </button>
                           <button onClick={() => handleDelete(c.id, 'coupon')} className="text-slate-400 hover:text-red-500 p-2">
                               <Trash2 size={18} />
                           </button>
                      </div>
                  </div>
              ))}
          </div>
          
          <button onClick={() => { setEditingItem({ type: 'fixed', active: true }); setIsModalOpen(true); }} className="fixed bottom-24 right-6 bg-rose-600 text-white p-4 rounded-full shadow-lg hover:bg-rose-700 transition z-10">
              <Plus size={24} />
          </button>
      </div>
  );

  // --- CONFIRMATION SCREEN ---
  const renderConfirmationStep = () => (
      <div className="text-center">
         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
         </div>
         <h3 className="text-xl font-bold text-slate-800 mb-6">Confirme seu Agendamento</h3>

         <div className="bg-slate-50 p-6 rounded-xl text-left space-y-4 mb-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-slate-500">Serviço</span>
              <span className="font-bold text-slate-800">{selectedService?.name}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-slate-500">Profissional</span>
              <span className="font-bold text-slate-800">{selectedEmployee?.name || 'Indiferente'}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-slate-500">Data</span>
              <span className="font-bold text-slate-800">{new Date(selectedDate + 'T12:00:00').toLocaleDateString()} às {selectedTime}</span>
            </div>

            {/* Coupon Input */}
            <div className="border-b border-slate-200 pb-3">
               <div className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="Código do Cupom"
                      className="flex-1 p-2 border border-slate-300 rounded-lg text-sm uppercase"
                      value={couponCodeInput}
                      onChange={e => setCouponCodeInput(e.target.value)}
                   />
                   <button 
                      onClick={handleApplyCoupon}
                      className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold hover:bg-black"
                   >
                      Aplicar
                   </button>
               </div>
               {appliedCoupon && (
                   <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                       <CheckCircle2 size={10} /> Cupom aplicado: {appliedCoupon.type === 'percent' ? `${appliedCoupon.discount}%` : `- ${settings.currency}${appliedCoupon.discount}`}
                   </p>
               )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-500">Total Estimado</span>
              <div className="text-right">
                  {appliedCoupon && (
                      <span className="block text-xs text-slate-400 line-through">
                          {settings.currency} {(selectedService?.price || 0) + cart.reduce((a,i) => a+i.price, 0)}
                      </span>
                  )}
                  <span className="font-bold text-rose-600 text-xl">
                    {settings.currency} { 
                        (() => {
                            const total = (selectedService?.price || 0) + cart.reduce((a,i) => a+i.price, 0);
                            if (!appliedCoupon) return total;
                            const discount = appliedCoupon.type === 'fixed' ? appliedCoupon.discount : (total * appliedCoupon.discount / 100);
                            return Math.max(0, total - discount).toFixed(2);
                        })()
                    }
                  </span>
              </div>
            </div>
         </div>

         <button
          onClick={handleConfirmBooking}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg"
         >
           Confirmar Agendamento
         </button>
      </div>
  );

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
    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = appointments.filter(a => a.date === today && a.status !== 'cancelled');
    const incomeToday = todaysAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
    const nextAppointment = todaysAppointments.filter(a => a.time > new Date().toLocaleTimeString().slice(0,5)).sort((a,b) => a.time.localeCompare(b.time))[0];

    // Metrics Calculation
    const completedApps = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completedApps.reduce((sum, a) => sum + a.totalPrice, 0);
    const avgTicket = completedApps.length > 0 ? totalRevenue / completedApps.length : 0;
    
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
    const totalAppsCount = appointments.length;
    const cancellationRate = totalAppsCount > 0 ? (cancelledCount / totalAppsCount) * 100 : 0;

    // Weekly Flow Calculation
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const flowData = new Array(7).fill(0);
    appointments.forEach(a => {
        const date = new Date(a.date);
        const dayIndex = new Date(a.date + 'T12:00:00').getDay();
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
                     <DollarSign size={14} className="text-green-500" /> {avgTicket.toFixed(0)}
                 </h3>
             </div>
             <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Cancelamentos</p>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                     <AlertCircle size={14} className="text-red-500" /> {cancellationRate.toFixed(0)}%
                 </h3>
             </div>
         </div>

         {/* Main KPIs */}
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-lg">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p>
               <h3 className="text-2xl font-bold">{todaysAppointments.length} <span className="text-sm font-normal text-slate-400">agend.</span></h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Faturamento Hoje</p>
               <h3 className="text-2xl font-bold text-green-600">{settings.currency} {incomeToday}</h3>
            </div>
         </div>

         {/* Charts Section */}
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <BarChart3 size={18} className="text-slate-400" /> Fluxo Semanal
             </h3>
             <div className="flex items-end justify-between h-24 gap-2">
                 {flowData.map((val, i) => (
                     <div key={i} className="flex flex-col items-center gap-1 w-full">
                         <div 
                            className="w-full bg-rose-100 rounded-t-md relative group hover:bg-rose-200 transition-all"
                            style={{ height: `${(val / maxFlow) * 100}%`, minHeight: '4px' }}
                         >
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition">{val}</span>
                         </div>
                         <span className="text-[10px] text-slate-400 font-medium">{weekDays[i]}</span>
                     </div>
                 ))}
             </div>
         </div>

         {/* Top Products */}
         {topProducts.length > 0 && (
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Trophy size={18} className="text-amber-500" /> Produtos Mais Vendidos
                 </h3>
                 <div className="space-y-4">
                     {topProducts.map((prod, i) => (
                         <div key={i}>
                             <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                 <span>{prod.name}</span>
                                 <span>{prod.count} un</span>
                             </div>
                             <div className="w-full bg-slate-100 rounded-full h-2">
                                 <div 
                                    className="bg-amber-400 h-2 rounded-full" 
                                    style={{ width: `${(prod.count / topProducts[0].count) * 100}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* Next Up */}
         {nextAppointment ? (
            <div className="bg-gradient-to-r from-rose-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">Próximo Cliente</span>
                        <h3 className="text-xl font-bold mt-2">{nextAppointment.clientName || 'Cliente sem nome'}</h3>
                        <p className="text-white/80 text-sm">{nextAppointment.serviceName}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-2xl font-bold">{nextAppointment.time}</p>
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
               <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{today.split('-').reverse().join('/')}</span>
            </h3>
            <div className="space-y-3">
               {todaysAppointments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Nenhum agendamento para hoje.</p>
               ) : (
                  todaysAppointments.sort((a,b) => a.time.localeCompare(b.time)).map(app => (
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

  const renderLandingPage = () => {
    if (!currentSalonMetadata) return null;
    return (
      <div className="animate-fadeIn">
         <div className="relative h-64 -mx-4 -mt-4 mb-6">
             <img src={currentSalonMetadata.coverUrl} className="w-full h-full object-cover" alt="Cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
             <button onClick={() => {
                 // Check if we have history to go back to (e.g. Admin Dashboard)
                 if (window.history.length > 1) {
                     window.history.back();
                     setShowLandingPage(false);
                     setView(ViewState.DASHBOARD); // Default fallback if history is weird, but usually browser back handles it
                 } else {
                     handleBackToMarketplace();
                 }
             }} className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition">
               <ArrowLeft size={24} />
             </button>
             
             {/* OWNER LOGIN BUTTON */}
             <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition"
                title="Área do Dono"
             >
                <Lock size={24} />
             </button>

             <div className="absolute bottom-6 left-6 text-white">
                <span className="bg-rose-600 text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block">{currentSalonMetadata.category}</span>
                <h1 className="text-3xl font-bold mb-1">{currentSalonMetadata.name}</h1>
                <p className="text-white/80 text-sm flex items-center gap-1"><MapPinIcon size={14} /> {currentSalonMetadata.location}</p>
             </div>
         </div>

         {/* Actions */}
         <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => { setIsBookingMode(true); setShowLandingPage(false); }}
              className="bg-rose-600 text-white py-3 px-4 rounded-xl font-bold shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Calendar size={18} /> Agendar
            </button>
            <button 
              onClick={() => { setView(ViewState.CLIENT_STORE); setShowLandingPage(false); }}
              className="bg-white text-slate-700 border border-slate-200 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
            >
               <ShoppingBag size={18} /> Ver Loja
            </button>
         </div>

         {/* About */}
         <div className="space-y-6">
            <section>
               <h3 className="font-bold text-lg text-slate-800 mb-3">Sobre</h3>
               <p className="text-slate-500 text-sm leading-relaxed">
                 Bem-vindo ao {currentSalonMetadata.name}. Oferecemos os melhores serviços de {currentSalonMetadata.category.toLowerCase()} da região com profissionais qualificados e ambiente acolhedor.
               </p>
            </section>

            <section>
               <h3 className="font-bold text-lg text-slate-800 mb-3">Horários</h3>
               <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Seg - Sex</span> <span>{settings.openTime} - {settings.closeTime}</span></div>
                  <div className="flex justify-between"><span>Sábado</span> <span>09:00 - 18:00</span></div>
                  <div className="flex justify-between text-slate-400"><span>Domingo</span> <span>Fechado</span></div>
               </div>
            </section>
         </div>
      </div>
    );
  };

  const renderClientDashboard = () => {
      const myAppointments = appointments.filter(a => a.clientId === currentUser?.id).sort((a,b) => b.createdAt - a.createdAt);
      const nextApp = myAppointments.find(a => a.status === 'scheduled' && new Date(a.date) >= new Date(new Date().setHours(0,0,0,0)));
      
      return (
          <div className="space-y-6 animate-fadeIn pb-24">
              <div className="flex justify-between items-center">
                 <div>
                     <h2 className="text-xl font-bold text-slate-800">Olá, {currentUser?.name.split(' ')[0]}</h2>
                     <p className="text-sm text-slate-500">Sua conta</p>
                 </div>
                 <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                     <LogOut size={20} />
                 </button>
              </div>

              {nextApp && (
                  <div className="bg-rose-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Próximo Agendamento</p>
                          <h3 className="text-2xl font-bold mb-1">{nextApp.serviceName}</h3>
                          <p className="text-white/90 text-sm mb-4">{new Date(nextApp.date + 'T12:00:00').toLocaleDateString()} às {nextApp.time}</p>
                          
                          <div className="flex gap-2">
                             <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm">
                                <User size={14} /> {nextApp.employeeName}
                             </div>
                             <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm">
                                <DollarSign size={14} /> {nextApp.totalPrice}
                             </div>
                          </div>
                      </div>
                      <div className="absolute -bottom-4 -right-4 opacity-20">
                          <Clock size={120} />
                      </div>
                  </div>
              )}

              <div className="space-y-3">
                 <h3 className="font-bold text-slate-700">Histórico</h3>
                 {myAppointments.length === 0 ? (
                     <div className="text-center py-8 text-slate-400">
                         <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                         <p>Você ainda não tem agendamentos ou pedidos.</p>
                     </div>
                 ) : (
                     myAppointments.map(app => (
                         <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                             <div>
                                 <h4 className={`font-bold ${app.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{app.serviceName}</h4>
                                 <p className="text-xs text-slate-500">{new Date(app.date + 'T12:00:00').toLocaleDateString()} • {app.time}</p>
                             </div>
                             <div className="text-right">
                                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                     app.status === 'scheduled' ? 'bg-green-100 text-green-700' : 
                                     app.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                 }`}>
                                     {app.status === 'scheduled' ? 'Confirmado' : app.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                                 </span>
                                 {app.status === 'scheduled' && (
                                     <button onClick={() => initiateCancelAppointment(app.id)} className="block mt-2 text-[10px] text-red-500 underline">Cancelar</button>
                                 )}
                             </div>
                         </div>
                     ))
                 )}
              </div>
              
              <button 
                 onClick={() => setIsBookingMode(true)}
                 className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition flex items-center justify-center gap-2"
              >
                  <Plus size={20} /> Novo Agendamento
              </button>
          </div>
      );
  };

  const renderClientBookingWizard = () => (
    <div className="pb-24 animate-fadeIn">
      {/* Header for booking flow */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { 
           if (bookingStep > 0) setBookingStep(bookingStep - 1);
           else { setIsBookingMode(false); } // Go back to Dashboard or LP
        }} className="p-2 hover:bg-slate-100 rounded-full">
           <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
           <h2 className="text-xl font-bold text-slate-800">
             {bookingStep === 0 && 'Escolha o Serviço'}
             {bookingStep === 1 && 'Escolha o Profissional'}
             {bookingStep === 2 && 'Data e Hora'}
             {bookingStep === 3 && 'Confirmação'}
           </h2>
           <div className="flex gap-1 mt-1">
              {[0,1,2,3].map(step => (
                 <div key={step} className={`h-1 rounded-full flex-1 transition-all ${step <= bookingStep ? 'bg-rose-500' : 'bg-slate-200'}`} />
              ))}
           </div>
        </div>
      </div>

      {bookingStep === 0 && (
        <div className="space-y-4 pb-24">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Serviços</h3>
          {services.map(service => {
             const isSelected = selectedService?.id === service.id;
             return (
                 <div 
                   key={service.id} 
                   onClick={() => setSelectedService(service)}
                   className={`bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer transition ${isSelected ? 'border-rose-600 ring-1 ring-rose-600 bg-rose-50' : 'border-slate-100 hover:border-rose-200'}`}
                 >
                    <div>
                       <h3 className={`font-bold ${isSelected ? 'text-rose-700' : 'text-slate-800'}`}>{service.name}</h3>
                       <p className="text-xs text-slate-500 mt-1">{service.duration} min • {service.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`font-bold ${isSelected ? 'text-rose-700' : 'text-slate-600'}`}>{settings.currency} {service.price}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-rose-600' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-rose-600 rounded-full" />}
                        </div>
                    </div>
                 </div>
             );
          })}
          
          {/* Products Upsell Section */}
           <div className="mt-8 border-t border-slate-100 pt-6">
             <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2"><ShoppingBag size={18} /> Adicionar Produtos?</h3>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {products.map(product => {
                    const countInCart = getCartCount(product.id);
                    const isOutOfStock = product.stock <= 0;
                    
                    return (
                        <div key={product.id} className={`shrink-0 w-44 bg-white border rounded-xl p-3 flex flex-col ${countInCart > 0 ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-100'} ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                           <div className="h-28 bg-slate-100 rounded-lg mb-2 overflow-hidden relative">
                              {product.photoUrl && <img src={product.photoUrl} className="w-full h-full object-cover" />}
                              {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold uppercase">Esgotado</div>}
                           </div>
                           <h4 className="font-bold text-sm truncate">{product.name}</h4>
                           <p className="text-xs text-slate-500 mb-3">{settings.currency} {product.price}</p>
                           
                           {isOutOfStock ? (
                               <button disabled className="mt-auto w-full py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed">
                                   Indisponível
                               </button>
                           ) : (
                               countInCart > 0 ? (
                                   <div className="mt-auto flex items-center justify-between bg-rose-50 rounded-lg p-1">
                                       <button onClick={(e) => { e.stopPropagation(); handleRemoveOneFromCart(product.id); }} className="p-1 text-rose-600 hover:bg-rose-200 rounded">
                                           <Minus size={14} />
                                       </button>
                                       <span className="text-xs font-bold text-rose-700">{countInCart}</span>
                                       <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} className="p-1 text-rose-600 hover:bg-rose-200 rounded">
                                           <Plus size={14} />
                                       </button>
                                   </div>
                               ) : (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                                      className="mt-auto w-full py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white transition hover:bg-black"
                                   >
                                      Adicionar
                                   </button>
                               )
                           )}
                        </div>
                    );
                })}
             </div>
           </div>
           
           {/* Fixed Bottom Action for Step 0 */}
           <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
               <button 
                 disabled={!selectedService}
                 onClick={() => setBookingStep(1)}
                 className={`w-full py-4 rounded-xl font-bold flex items-center justify-between px-6 transition ${selectedService ? 'bg-rose-600 text-white shadow-lg hover:bg-rose-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
               >
                 <span>Continuar</span>
                 {selectedService && (
                    <span className="bg-white/20 px-2 py-1 rounded text-sm">
                        {settings.currency} {((selectedService.price) + cart.reduce((acc, item) => acc + item.price, 0)).toFixed(2)}
                    </span>
                 )}
                 {!selectedService && <ArrowRight size={18} />}
               </button>
           </div>
        </div>
      )}

      {bookingStep === 1 && (
        <div className="grid grid-cols-2 gap-4">
           <div 
              onClick={() => { setSelectedEmployee(null); setBookingStep(2); }}
              className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition min-h-[160px]"
           >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-slate-400">
                <Users size={24} />
              </div>
              <span className="font-bold text-slate-700">Sem preferência</span>
              <span className="text-xs text-slate-400">Primeiro disponível</span>
           </div>
           {employees.map(emp => (
              <div 
                key={emp.id}
                onClick={() => { setSelectedEmployee(emp); setBookingStep(2); }}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-rose-500 transition relative overflow-hidden group"
              >
                 <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden border-2 border-white shadow-sm">
                    {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                 </div>
                 <h3 className="font-bold text-slate-800 text-sm">{emp.name}</h3>
                 <p className="text-xs text-rose-500 font-medium">{emp.role}</p>
                 <div className="absolute inset-0 border-2 border-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none"></div>
              </div>
           ))}
        </div>
      )}

      {bookingStep === 2 && (
        <div className="space-y-6">
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
               <CalendarDays size={18} className="text-rose-500" /> Selecione a Data
             </label>
             <input 
               type="date" 
               className="w-full p-3 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-rose-500"
               value={selectedDate}
               min={new Date().toISOString().split('T')[0]}
               onChange={(e) => setSelectedDate(e.target.value)}
             />
           </div>

           <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Clock size={18} className="text-rose-500" /> Horários Disponíveis
              </label>
              <div className="grid grid-cols-4 gap-3">
                 {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => {
                    // Simple check if taken (mock logic)
                    const isTaken = appointments.some(a => a.date === selectedDate && a.time === time && a.status !== 'cancelled');
                    return (
                        <button 
                           key={time} 
                           disabled={isTaken}
                           onClick={() => { setSelectedTime(time); setBookingStep(3); }}
                           className={`py-2 rounded-lg text-sm font-bold transition ${
                               isTaken 
                               ? 'bg-slate-100 text-slate-300 cursor-not-allowed decoration-slice line-through' 
                               : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-500 hover:text-rose-600'
                           }`}
                        >
                           {time}
                        </button>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

      {bookingStep === 3 && renderConfirmationStep()}
    </div>
  );

  const renderClientView = () => {
      // Split view: Dashboard (My Appointments) vs Booking Wizard
      if (!isBookingMode) {
          return renderClientDashboard();
      }
      return renderClientBookingWizard();
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
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"> <X size={24} /> </button>
              </div>
              
              {view === ViewState.SERVICES && renderServiceForm()}
              {view === ViewState.PRODUCTS && renderProductForm()}
              {view === ViewState.TEAM && renderEmployeeForm()}
              
              {/* Transaction Form */}
              {view === ViewState.FINANCE && (
                   <form onSubmit={handleSaveTransaction} className="space-y-4">
                       <div> <label className="block text-sm font-medium text-slate-700">Descrição</label> <input type="text" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} /> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Valor</label> <input type="number" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.amount || ''} onChange={e => setEditingItem({...editingItem, amount: parseFloat(e.target.value)})} /> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Tipo</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.type || 'expense'} onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}> <option value="expense">Despesa</option> <option value="income">Receita</option> </select> </div>
                       <div> <label className="block text-sm font-medium text-slate-700">Status</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Transaction)?.status || 'paid'} onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}> <option value="paid">Pago / Recebido</option> <option value="pending">Pendente / A Receber</option> </select> </div>
                       <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Salvar</button>
                   </form>
              )}
              {/* Coupon Form */}
              {view === ViewState.COUPONS && (
                   <form onSubmit={handleSaveCoupon} className="space-y-4">
                       <div> <label className="block text-sm font-medium text-slate-700">Código do Cupom</label> <input type="text" required className="mt-1 block w-full p-2 border rounded-md uppercase" placeholder="Ex: BEMVINDO10" value={(editingItem as Coupon)?.code || ''} onChange={e => setEditingItem({...editingItem, code: e.target.value})} /> </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div> <label className="block text-sm font-medium text-slate-700">Tipo</label> <select className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Coupon)?.type || 'fixed'} onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}> <option value="fixed">Fixo (R$)</option> <option value="percent">Porcentagem (%)</option> </select> </div>
                           <div> <label className="block text-sm font-medium text-slate-700">Valor Desconto</label> <input type="number" required className="mt-1 block w-full p-2 border rounded-md" value={(editingItem as Coupon)?.discount || ''} onChange={e => setEditingItem({...editingItem, discount: parseFloat(e.target.value)})} /> </div>
                       </div>
                       <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Salvar Cupom</button>
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
