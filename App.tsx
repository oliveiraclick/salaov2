
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import { ViewState, SalonMetadata, Service, Appointment, Product, Transaction, Employee, Client, ShopSettings, Tenant, SaasPlan } from './types';
import { getPlatformSalons, setCurrentNamespace, getSettings, getServices, getEmployees, saveAppointments, getAppointments, getProducts, addTransaction, saveTransactions, getClients, saveClient, getTransactions, saveServices, saveProducts, saveEmployees, saveSettings, incrementViews, getTenants, getSaasPlans, saveSaasPlans } from './services/storage';
import { Calendar, LayoutDashboard, Scissors, Store, Users, Wallet, Settings, Package, Percent, MapPin, Phone, Star, Share2, Lock, ArrowLeft, Clock, Search, ChevronRight, Check, Globe, Zap, Heart, CheckCircle2, X, User, Plus, Minus, Trash2, ShoppingBag, DollarSign, CalendarDays, History, AlertCircle, LogOut, TrendingUp, TrendingDown, Edit2, Camera, Save, BarChart3, Shield, Map, CreditCard, Tag } from 'lucide-react';

// Helper interface for local cart state
interface CartItem {
  product: Product;
  quantity: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SAAS_LP);
  const [activeClientTab, setActiveClientTab] = useState<'home' | 'appointments' | 'store'>('home');
  const [salonName, setSalonName] = useState<string>('');
  
  // State for Admin Modal
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  // State for Booking Modal
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [selectedEmployeeForBooking, setSelectedEmployeeForBooking] = useState<Employee | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Professional, 2: Products, 3: DateTime, 4: Info, 5: Success
  const [bookingDate, setBookingDate] = useState<string>(''); // YYYY-MM-DD
  const [bookingTime, setBookingTime] = useState<string>('');
  
  // Client Data for Booking
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientBirthDate, setClientBirthDate] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  // Client Session (Account Tab)
  const [clientLoggedInPhone, setClientLoggedInPhone] = useState<string | null>(null);
  const [clientLoginInput, setClientLoginInput] = useState('');

  // Changed to CartItem array to support quantity
  const [bookingCart, setBookingCart] = useState<CartItem[]>([]);

  // State for Admin Checkout
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null);
  // Changed to CartItem array to support quantity
  const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);

  // Detect direct link (query param ?salon=slug)
  const [isDirectLink, setIsDirectLink] = useState(false);

  // --- CRUD STATES ---
  // Services
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({});

  // Products
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});

  // Team
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({});

  // Finance
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({ type: 'expense', date: new Date().toISOString().split('T')[0] });

  // Settings
  const [settingsForm, setSettingsForm] = useState<ShopSettings | null>(null);

  // SaaS Plans CRUD
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SaasPlan>>({ features: [] });
  const [featureInput, setFeatureInput] = useState('');

  // Memoized Data
  const services = useMemo(() => getServices(), [view, isEditingService]); // Refresh on edit
  const products = useMemo(() => getProducts(), [view, isEditingProduct]);
  const employees = useMemo(() => getEmployees(), [view, isEditingEmployee]);
  const appointments = useMemo(() => getAppointments(), [view, checkoutAppointment, bookingStep, activeClientTab]); 
  const clients = useMemo(() => getClients(), [bookingStep, view]);
  const transactions = useMemo(() => getTransactions(), [view, isAddingTransaction, checkoutAppointment]);
  const currentSettings = useMemo(() => getSettings(), [view]);
  
  // SaaS Data
  const tenants = useMemo(() => getTenants(), [view]);
  const saasPlans = useMemo(() => getSaasPlans(), [view, isEditingPlan]);

  useEffect(() => {
    // Check URL parameters on mount
    const params = new URLSearchParams(window.location.search);
    const salonSlug = params.get('salon');

    if (salonSlug) {
      setIsDirectLink(true);
      setCurrentNamespace(salonSlug);
      incrementViews();
      const settings = getSettings();
      setSalonName(settings.shopName);
      setView(ViewState.PUBLIC_SALON);
    }
  }, []);

  useEffect(() => {
    // Update salon name when view changes
    if (view === ViewState.PUBLIC_SALON || view === ViewState.DASHBOARD) {
      const settings = getSettings();
      setSalonName(settings.shopName);
      setSettingsForm(settings);
    }
  }, [view]);

  // Set default booking date to today on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
  }, []);

  // Smart Client Detection in Booking
  useEffect(() => {
      if (bookingStep === 4 && clientPhone.length >= 8) {
          const foundClient = clients.find(c => c.phone === clientPhone);
          if (foundClient) {
              setClientName(foundClient.name);
              setIsNewClient(false);
          } else {
              setIsNewClient(true);
          }
      }
  }, [clientPhone, bookingStep, clients]);

  const handleSalonSelect = (salon: SalonMetadata) => {
    setCurrentNamespace(salon.slug);
    setSalonName(salon.name);
    setView(ViewState.PUBLIC_SALON);
  };

  const handleAdminLogin = () => {
    if (adminPass === 'admin123') { 
      // Login Dono do Salão
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.DASHBOARD);
    } else if (adminPass === 'saas123') {
      // Login Super Admin (SaaS Platform)
      setShowAdminLogin(false);
      setAdminPass('');
      setView(ViewState.SAAS_ADMIN);
    } else {
      alert('Senha incorreta. (Tente: admin123 ou saas123)');
    }
  };

  const handleAdminLogout = () => {
    if (isDirectLink) {
        setView(ViewState.PUBLIC_SALON);
    } else {
        setView(ViewState.SAAS_LP);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: salonName || 'BelezaManager',
      text: `Agende seu horário no ${salonName || 'nosso salão'}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  // --- IMAGE UPLOAD HELPER ---
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CLIENT ACCOUNT LOGIC ---
  const handleClientLogin = () => {
      if (clientLoginInput.length < 8) {
          alert("Por favor, digite um telefone válido.");
          return;
      }
      setClientLoggedInPhone(clientLoginInput);
  };

  const handleCancelAppointment = (appointmentId: string) => {
      if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
          const currentApps = getAppointments();
          const updatedApps = currentApps.map(app => 
              app.id === appointmentId ? { ...app, status: 'cancelled' as const } : app
          );
          saveAppointments(updatedApps);
          setActiveClientTab('appointments'); 
          setView(prev => prev); 
      }
  };

  // --- BOOKING LOGIC ---

  const openBookingModal = (service: Service) => {
    setSelectedServiceForBooking(service);
    setSelectedEmployeeForBooking(null);
    setBookingCart([]);
    setBookingStep(1); 
    setBookingTime('');
    setClientName('');
    setClientPhone('');
    setClientBirthDate('');
    setIsNewClient(false);
  };

  const closeBookingModal = () => {
    setSelectedServiceForBooking(null);
    setSelectedEmployeeForBooking(null);
    setBookingCart([]);
  };

  const updateBookingQuantity = (product: Product, delta: number) => {
    setBookingCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQty = existingItem.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(item => item.product.id !== product.id);
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const confirmBooking = () => {
    if (!selectedServiceForBooking || !selectedEmployeeForBooking || !bookingDate || !bookingTime || !clientName || !clientPhone) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    if (isNewClient && !clientBirthDate) {
        alert("Por favor, informe sua data de nascimento para o cadastro.");
        return;
    }

    if (isNewClient) {
        const newClient: Client = {
            id: Date.now().toString(),
            name: clientName,
            phone: clientPhone,
            birthDate: clientBirthDate,
            createdAt: Date.now()
        };
        saveClient(newClient);
    }

    const finalProductsList: Product[] = [];
    bookingCart.forEach(item => {
        for(let i=0; i<item.quantity; i++) {
            finalProductsList.push(item.product);
        }
    });

    const productsTotal = finalProductsList.reduce((sum, p) => sum + p.price, 0);
    const finalTotal = selectedServiceForBooking.price + productsTotal;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      serviceId: selectedServiceForBooking.id,
      serviceName: selectedServiceForBooking.name,
      employeeId: selectedEmployeeForBooking.id, 
      employeeName: selectedEmployeeForBooking.name,
      employeePhotoUrl: selectedEmployeeForBooking.photoUrl,
      clientName: clientName,
      clientId: clientPhone, 
      date: bookingDate,
      time: bookingTime,
      price: selectedServiceForBooking.price,
      products: finalProductsList,
      totalPrice: finalTotal,
      duration: selectedServiceForBooking.duration,
      status: 'scheduled',
      createdAt: Date.now()
    };

    const currentAppointments = getAppointments();
    saveAppointments([...currentAppointments, newAppointment]);
    
    setBookingStep(5); 
  };

  // --- CHECKOUT LOGIC ---

  const openCheckoutModal = (appointment: Appointment) => {
    setCheckoutAppointment(appointment);
    setCheckoutCart([]);
  };

  const closeCheckoutModal = () => {
    setCheckoutAppointment(null);
    setCheckoutCart([]);
  };

  const updateCheckoutQuantity = (product: Product, delta: number) => {
    setCheckoutCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQty = existingItem.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(item => item.product.id !== product.id);
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      } else if (delta > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const finalizeCheckout = () => {
      if (!checkoutAppointment) return;

      const currentApps = getAppointments();
      const updatedApps = currentApps.map(app => {
          if (app.id === checkoutAppointment.id) {
              const existingProducts = app.products || [];
              const newProducts: Product[] = [];
              checkoutCart.forEach(item => {
                  for(let i=0; i<item.quantity; i++) {
                      newProducts.push(item.product);
                  }
              });

              const allProducts = [...existingProducts, ...newProducts];
              const productsTotal = allProducts.reduce((sum, p) => sum + p.price, 0);
              
              const updatedApp = {
                  ...app,
                  status: 'completed' as const,
                  products: allProducts,
                  totalPrice: app.price + productsTotal
              };

              const transaction: Transaction = {
                  id: Date.now().toString(),
                  title: `Serviço: ${app.clientName}`,
                  amount: updatedApp.totalPrice,
                  type: 'income',
                  category: 'service',
                  status: 'paid',
                  date: new Date().toISOString().split('T')[0],
                  relatedAppointmentId: app.id
              };
              addTransaction(transaction);

              return updatedApp;
          }
          return app;
      });

      saveAppointments(updatedApps);
      closeCheckoutModal();
  };

  // --- CRUD HANDLERS ---
  
  // Services
  const handleSaveService = () => {
      if (!serviceForm.name || !serviceForm.price) return alert("Nome e preço obrigatórios");
      
      const newService: Service = {
          id: editingServiceId || Date.now().toString(),
          name: serviceForm.name,
          price: Number(serviceForm.price),
          duration: Number(serviceForm.duration) || 30,
          description: serviceForm.description || ''
      };

      const updatedServices = editingServiceId 
          ? services.map(s => s.id === editingServiceId ? newService : s)
          : [...services, newService];
      
      saveServices(updatedServices);
      setIsEditingService(false);
      setServiceForm({});
      setEditingServiceId(null);
  };

  const handleDeleteService = (id: string) => {
      if(window.confirm("Excluir serviço?")) {
          saveServices(services.filter(s => s.id !== id));
      }
  };

  // Products
  const handleSaveProduct = () => {
      if (!productForm.name || !productForm.price) return alert("Nome e preço obrigatórios");
      
      const newProduct: Product = {
          id: editingProductId || Date.now().toString(),
          name: productForm.name,
          price: Number(productForm.price),
          stock: Number(productForm.stock) || 0,
          description: productForm.description || '',
          photoUrl: productForm.photoUrl || ''
      };

      const updatedProducts = editingProductId
          ? products.map(p => p.id === editingProductId ? newProduct : p)
          : [...products, newProduct];
      
      saveProducts(updatedProducts);
      setIsEditingProduct(false);
      setProductForm({});
      setEditingProductId(null);
  };

  const handleDeleteProduct = (id: string) => {
       if(window.confirm("Excluir produto?")) {
          saveProducts(products.filter(p => p.id !== id));
      }
  };

  // Team
  const handleSaveEmployee = () => {
      if (!employeeForm.name) return alert("Nome obrigatório");
      
      const newEmployee: Employee = {
          id: editingEmployeeId || Date.now().toString(),
          name: employeeForm.name,
          role: employeeForm.role || 'Profissional',
          bio: employeeForm.bio || '',
          photoUrl: employeeForm.photoUrl || ''
      };

      const updatedEmployees = editingEmployeeId
          ? employees.map(e => e.id === editingEmployeeId ? newEmployee : e)
          : [...employees, newEmployee];
      
      saveEmployees(updatedEmployees);
      setIsEditingEmployee(false);
      setEmployeeForm({});
      setEditingEmployeeId(null);
  };

  const handleDeleteEmployee = (id: string) => {
       if(window.confirm("Excluir profissional?")) {
          saveEmployees(employees.filter(e => e.id !== id));
      }
  };

  // Finance
  const handleSaveTransaction = () => {
      if (!transactionForm.title || !transactionForm.amount) return alert("Título e valor obrigatórios");
      
      const newTransaction: Transaction = {
          id: Date.now().toString(),
          title: transactionForm.title,
          amount: Number(transactionForm.amount),
          type: transactionForm.type || 'expense',
          category: transactionForm.category || 'operational',
          status: 'paid',
          date: transactionForm.date || new Date().toISOString().split('T')[0]
      };
      
      addTransaction(newTransaction);
      setIsAddingTransaction(false);
      setTransactionForm({ type: 'expense', date: new Date().toISOString().split('T')[0] });
  };

  // Settings
  const handleSaveSettings = () => {
      if (!settingsForm) return;
      saveSettings(settingsForm);
      setSalonName(settingsForm.shopName);
      alert("Configurações salvas!");
  };

  // SaaS Plans
  const handleAddFeature = () => {
      if (!featureInput.trim()) return;
      setPlanForm(prev => ({
          ...prev,
          features: [...(prev.features || []), featureInput.trim()]
      }));
      setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
      setPlanForm(prev => ({
          ...prev,
          features: (prev.features || []).filter((_, i) => i !== index)
      }));
  };

  const handleSavePlan = () => {
      if (!planForm.name) return alert("Nome do plano é obrigatório");
      if (planForm.price === undefined) return alert("Preço é obrigatório");

      const newPlan: SaasPlan = {
          id: editingPlanId || Date.now().toString(),
          name: planForm.name,
          price: Number(planForm.price),
          features: planForm.features || [],
          isRecommended: planForm.isRecommended || false
      };

      const updatedPlans = editingPlanId
          ? saasPlans.map(p => p.id === editingPlanId ? newPlan : p)
          : [...saasPlans, newPlan];
      
      saveSaasPlans(updatedPlans);
      setIsEditingPlan(false);
      setPlanForm({ features: [] });
      setEditingPlanId(null);
  };

  const handleDeletePlan = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este plano?")) {
          saveSaasPlans(saasPlans.filter(p => p.id !== id));
      }
  };

  // --- RENDERERS ---

  const renderDashboard = () => {
    // Analytics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const totalRevenue = completedAppointments.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Busiest Day
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayCounts = new Array(7).fill(0);
    appointments.forEach(a => {
        const day = new Date(a.date).getDay(); // Note: This depends on timezone handling in real apps
        dayCounts[day]++;
    });
    const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const busiestDay = maxDayIndex >= 0 ? days[maxDayIndex] : '-';

    // Popular Service
    const serviceCounts: Record<string, number> = {};
    appointments.forEach(a => {
        serviceCounts[a.serviceName] = (serviceCounts[a.serviceName] || 0) + 1;
    });
    const popularService = Object.keys(serviceCounts).sort((a,b) => serviceCounts[b] - serviceCounts[a])[0] || '-';

    // Best Selling Product
    const productCounts: Record<string, number> = {};
    appointments.forEach(a => {
        if(a.products) {
            a.products.forEach(p => {
                productCounts[p.name] = (productCounts[p.name] || 0) + 1;
            });
        }
    });
    const bestProduct = Object.keys(productCounts).sort((a,b) => productCounts[b] - productCounts[a])[0] || '-';


    return (
        <div className="space-y-6 animate-fade-in pb-20">
             <div className="flex justify-between items-center px-2">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gestão</p>
                    <h2 className="text-xl font-black text-slate-800">{salonName}</h2>
                </div>
                <button onClick={handleAdminLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-full hover:bg-rose-100 transition-colors">
                    Sair
                </button>
             </div>

             {/* Stats Cards */}
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                     <p className="text-xs text-slate-400 font-bold uppercase mb-1">Faturamento</p>
                     <p className="text-2xl font-black text-emerald-600">R$ {totalRevenue}</p>
                 </div>
                 <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                     <p className="text-xs text-slate-400 font-bold uppercase mb-1">Agendamentos</p>
                     <p className="text-2xl font-black text-slate-800">{totalAppointments}</p>
                 </div>
             </div>

             {/* Insights */}
             <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Zap size={18} className="text-yellow-500 fill-yellow-500" /> Insights do Salão
                 </h3>
                 
                 <div className="space-y-3">
                     <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                         <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full text-rose-500"><Calendar size={16} /></div>
                             <span className="text-sm font-medium text-slate-600">Dia Mais Movimentado</span>
                         </div>
                         <span className="font-bold text-slate-800">{busiestDay}</span>
                     </div>

                     <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                         <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full text-purple-500"><Scissors size={16} /></div>
                             <span className="text-sm font-medium text-slate-600">Serviço Top 1</span>
                         </div>
                         <span className="font-bold text-slate-800 text-sm max-w-[120px] truncate">{popularService}</span>
                     </div>

                     <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                         <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full text-emerald-500"><ShoppingBag size={16} /></div>
                             <span className="text-sm font-medium text-slate-600">Produto Top 1</span>
                         </div>
                         <span className="font-bold text-slate-800 text-sm max-w-[120px] truncate">{bestProduct}</span>
                     </div>
                 </div>

                 {/* Sugestão IA Mock */}
                 <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 mt-2">
                     <p className="text-xs text-indigo-800 leading-relaxed">
                         <span className="font-bold">Dica:</span> Seu dia mais fraco é Terça-feira. Que tal criar uma promoção "Terça dos Cortes" com 15% de desconto para aumentar o movimento?
                     </p>
                 </div>
             </div>

             {/* Recent Pending Appointments */}
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Próximos Clientes</h3>
                {appointments.filter(a => a.status === 'scheduled').length > 0 ? (
                    <div className="space-y-3">
                        {appointments.filter(a => a.status === 'scheduled').slice(0, 3).map(app => (
                            <div key={app.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">
                                            {app.clientName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{app.clientName}</p>
                                            <p className="text-xs text-slate-400">{app.serviceName} • {app.time}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openCheckoutModal(app)}
                                        className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-emerald-600 transition-colors shadow-sm"
                                    >
                                        <Check size={14} /> Atender
                                    </button>
                                </div>
                            </div>
                        ))}
                         <button onClick={() => setView(ViewState.DASHBOARD)} className="w-full text-center text-xs font-bold text-slate-400 mt-2">Ver Todos</button>
                    </div>
                ) : (
                    <p className="text-center text-slate-400 text-sm py-4">Agenda livre por enquanto.</p>
                )}
             </div>
        </div>
    );
  };

  const renderServices = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-black text-slate-800">Serviços</h2>
              <button 
                  onClick={() => {
                      setServiceForm({});
                      setEditingServiceId(null);
                      setIsEditingService(true);
                  }}
                  className="bg-slate-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </div>

          {isEditingService ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-bold text-slate-800">{editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                  <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                      placeholder="Nome do Serviço (ex: Corte)" 
                      value={serviceForm.name || ''}
                      onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                  />
                  <div className="flex gap-4">
                       <input 
                          type="number"
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Preço (R$)" 
                          value={serviceForm.price || ''}
                          onChange={e => setServiceForm({...serviceForm, price: Number(e.target.value)})}
                      />
                       <input 
                          type="number"
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Duração (min)" 
                          value={serviceForm.duration || ''}
                          onChange={e => setServiceForm({...serviceForm, duration: Number(e.target.value)})}
                      />
                  </div>
                  <textarea 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" 
                      placeholder="Descrição breve" 
                      value={serviceForm.description || ''}
                      onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                      rows={3}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setIsEditingService(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                      <button onClick={handleSaveService} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                  </div>
              </div>
          ) : (
              <div className="space-y-3">
                  {services.map(service => (
                      <div key={service.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                          <div>
                              <h4 className="font-bold text-slate-800">{service.name}</h4>
                              <p className="text-xs text-slate-400">{service.duration} min • R$ {service.price}</p>
                          </div>
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => {
                                      setServiceForm(service);
                                      setEditingServiceId(service.id);
                                      setIsEditingService(true);
                                  }}
                                  className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                  onClick={() => handleDeleteService(service.id)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
                  {services.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum serviço cadastrado.</p>}
              </div>
          )}
      </div>
  );

  const renderProducts = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-black text-slate-800">Loja & Estoque</h2>
               <button 
                  onClick={() => {
                      setProductForm({});
                      setEditingProductId(null);
                      setIsEditingProduct(true);
                  }}
                  className="bg-slate-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </div>

          {isEditingProduct ? (
               <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-bold text-slate-800">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                  <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                      placeholder="Nome do Produto" 
                      value={productForm.name || ''}
                      onChange={e => setProductForm({...productForm, name: e.target.value})}
                  />
                  <div className="flex gap-4">
                       <input 
                          type="number"
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Preço (R$)" 
                          value={productForm.price || ''}
                          onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                      />
                       <input 
                          type="number"
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                          placeholder="Estoque" 
                          value={productForm.stock || ''}
                          onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})}
                      />
                  </div>

                  {/* Image Upload for Product */}
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Foto do Produto</label>
                      <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 relative">
                              {productForm.photoUrl ? (
                                  <>
                                      <img src={productForm.photoUrl} className="w-full h-full object-cover" />
                                      <button 
                                          onClick={() => setProductForm({...productForm, photoUrl: ''})}
                                          className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </>
                              ) : (
                                  <Package className="text-slate-300" />
                              )}
                          </div>
                          <div className="flex-1">
                              <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                  <Camera size={18} />
                                  <span>Escolher Imagem</span>
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleImageUpload(e, (url) => setProductForm({...productForm, photoUrl: url}))} 
                                  />
                              </label>
                          </div>
                      </div>
                  </div>

                  <textarea 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" 
                      placeholder="Descrição" 
                      value={productForm.description || ''}
                      onChange={e => setProductForm({...productForm, description: e.target.value})}
                      rows={2}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                      <button onClick={handleSaveProduct} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-4">
                  {products.map(product => (
                      <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                          <div className="h-24 bg-slate-100 rounded-xl mb-3 overflow-hidden relative">
                              {product.photoUrl ? (
                                  <img src={product.photoUrl} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Package /></div>
                              )}
                              <div className="absolute top-1 right-1 bg-white/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-800 shadow-sm">
                                  Qtd: {product.stock}
                              </div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-rose-500 font-bold mb-3">R$ {product.price}</p>
                          <div className="flex gap-2 mt-auto">
                              <button 
                                  onClick={() => {
                                      setProductForm(product);
                                      setEditingProductId(product.id);
                                      setIsEditingProduct(true);
                                  }}
                                  className="flex-1 p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex justify-center"
                              >
                                  <Edit2 size={14} />
                              </button>
                              <button 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="flex-1 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 flex justify-center"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      </div>
                  ))}
                   {products.length === 0 && <div className="col-span-2 text-center text-slate-400 py-8">Nenhum produto cadastrado.</div>}
              </div>
          )}
      </div>
  );

  const renderTeam = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-black text-slate-800">Equipe</h2>
              <button 
                  onClick={() => {
                      setEmployeeForm({});
                      setEditingEmployeeId(null);
                      setIsEditingEmployee(true);
                  }}
                  className="bg-slate-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
              >
                  <Plus size={20} />
              </button>
          </div>

           {isEditingEmployee ? (
               <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-bold text-slate-800">{editingEmployeeId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                  <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                      placeholder="Nome Completo" 
                      value={employeeForm.name || ''}
                      onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                  />
                  <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                      placeholder="Cargo / Especialidade" 
                      value={employeeForm.role || ''}
                      onChange={e => setEmployeeForm({...employeeForm, role: e.target.value})}
                  />
                  
                  {/* Image Upload for Employee */}
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Foto do Perfil</label>
                      <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 relative">
                              {employeeForm.photoUrl ? (
                                  <>
                                      <img src={employeeForm.photoUrl} className="w-full h-full object-cover" />
                                      <button 
                                          onClick={() => setEmployeeForm({...employeeForm, photoUrl: ''})}
                                          className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </>
                              ) : (
                                  <User className="text-slate-300" />
                              )}
                          </div>
                          <div className="flex-1">
                              <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                                  <Camera size={18} />
                                  <span>Escolher Imagem</span>
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleImageUpload(e, (url) => setEmployeeForm({...employeeForm, photoUrl: url}))} 
                                  />
                              </label>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setIsEditingEmployee(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                      <button onClick={handleSaveEmployee} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                  </div>
              </div>
           ) : (
               <div className="space-y-3">
                   {employees.map(employee => (
                       <div key={employee.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                           <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden shrink-0">
                               {employee.photoUrl ? (
                                   <img src={employee.photoUrl} className="w-full h-full object-cover" />
                               ) : (
                                   <Users className="w-full h-full p-3 text-slate-300" />
                               )}
                           </div>
                           <div className="flex-1">
                               <h4 className="font-bold text-slate-800">{employee.name}</h4>
                               <p className="text-xs text-slate-400">{employee.role}</p>
                           </div>
                           <div className="flex gap-2">
                               <button 
                                  onClick={() => {
                                      setEmployeeForm(employee);
                                      setEditingEmployeeId(employee.id);
                                      setIsEditingEmployee(true);
                                  }}
                                  className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                              >
                                  <Trash2 size={16} />
                              </button>
                           </div>
                       </div>
                   ))}
               </div>
           )}
      </div>
  );

  const renderFinance = () => {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
      const balance = totalIncome - totalExpense;

      return (
        <div className="space-y-6 animate-fade-in pb-20">
             <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-black text-slate-800">Financeiro</h2>
                <button 
                    onClick={() => setIsAddingTransaction(!isAddingTransaction)}
                    className="bg-slate-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"
                >
                    {isAddingTransaction ? <X size={20} /> : <Plus size={20} />}
                </button>
             </div>

             {isAddingTransaction && (
                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 animate-scale-in">
                     <h3 className="font-bold text-slate-800">Nova Transação</h3>
                     
                     <div className="flex bg-slate-50 p-1 rounded-xl">
                         <button 
                            onClick={() => setTransactionForm({...transactionForm, type: 'income'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionForm.type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
                         >
                             Receita
                         </button>
                         <button 
                            onClick={() => setTransactionForm({...transactionForm, type: 'expense'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionForm.type === 'expense' ? 'bg-white shadow-sm text-red-500' : 'text-slate-400'}`}
                         >
                             Despesa
                         </button>
                     </div>

                     <input 
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                        placeholder="Descrição (ex: Conta de Luz)" 
                        value={transactionForm.title || ''}
                        onChange={e => setTransactionForm({...transactionForm, title: e.target.value})}
                     />
                     <div className="flex gap-4">
                        <input 
                            type="number"
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                            placeholder="Valor (R$)" 
                            value={transactionForm.amount || ''}
                            onChange={e => setTransactionForm({...transactionForm, amount: Number(e.target.value)})}
                        />
                        <input 
                            type="date"
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                            value={transactionForm.date}
                            onChange={e => setTransactionForm({...transactionForm, date: e.target.value})}
                        />
                     </div>
                     <button onClick={handleSaveTransaction} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">Adicionar</button>
                 </div>
             )}

             {/* Balance Cards - White Theme */}
             <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                 <p className="text-slate-400 text-xs font-bold uppercase mb-1">Saldo Atual</p>
                 <p className={`text-4xl font-black mb-8 ${balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>R$ {balance.toFixed(2)}</p>
                 <div className="flex gap-8">
                     <div>
                         <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold mb-1 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                             <TrendingUp size={12} /> Entradas
                         </div>
                         <p className="text-xl font-bold text-slate-800">R$ {totalIncome.toFixed(2)}</p>
                     </div>
                     <div>
                         <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mb-1 bg-red-50 px-2 py-1 rounded-md w-fit">
                             <TrendingDown size={12} /> Saídas
                         </div>
                         <p className="text-xl font-bold text-slate-800">R$ {totalExpense.toFixed(2)}</p>
                     </div>
                 </div>
             </div>

             {/* Transaction List */}
             <div>
                 <h3 className="font-bold text-slate-800 mb-4 px-2">Extrato</h3>
                 <div className="space-y-3">
                     {transactions.slice().reverse().map(t => (
                         <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                     {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                                     <p className="text-xs text-slate-400">{t.date.split('-').reverse().join('/')}</p>
                                 </div>
                             </div>
                             <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                 {t.type === 'income' ? '+' : '-'} R$ {t.amount}
                             </span>
                         </div>
                     ))}
                     {transactions.length === 0 && <p className="text-center text-slate-400 py-4">Nenhuma movimentação.</p>}
                 </div>
             </div>
        </div>
      );
  };

  const renderSettings = () => (
      <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-black text-slate-800">Ajustes</h2>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Store size={18} /> Dados do Salão
                  </h3>
                  <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome do Salão</label>
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium mt-1" 
                          value={settingsForm?.shopName || ''}
                          onChange={e => setSettingsForm(prev => prev ? {...prev, shopName: e.target.value} : null)}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Endereço</label>
                      <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium mt-1" 
                          value={settingsForm?.address || ''}
                          onChange={e => setSettingsForm(prev => prev ? {...prev, address: e.target.value} : null)}
                      />
                  </div>
              </div>

              <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={18} /> Horários
                  </h3>
                  <div className="flex gap-4">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Abertura</label>
                          <input 
                              type="time"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium mt-1" 
                              value={settingsForm?.openTime || ''}
                              onChange={e => setSettingsForm(prev => prev ? {...prev, openTime: e.target.value} : null)}
                          />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Fechamento</label>
                          <input 
                              type="time"
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium mt-1" 
                              value={settingsForm?.closeTime || ''}
                              onChange={e => setSettingsForm(prev => prev ? {...prev, closeTime: e.target.value} : null)}
                          />
                      </div>
                  </div>
              </div>
              
              <button 
                  onClick={handleSaveSettings}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                  <Save size={18} /> Salvar Alterações
              </button>
          </div>
      </div>
  );

  const renderSaaSPlans = () => (
      <div className="space-y-8 animate-fade-in p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
          <header className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                   <button onClick={() => setView(ViewState.SAAS_ADMIN)} className="p-2 bg-white rounded-full text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100">
                       <ArrowLeft size={20} />
                   </button>
                   <div>
                       <h1 className="text-3xl font-black text-slate-900">Planos de Assinatura</h1>
                       <p className="text-slate-500">Configure as ofertas da Landing Page</p>
                   </div>
              </div>
              {!isEditingPlan && (
                  <button 
                      onClick={() => {
                          setPlanForm({ features: [] });
                          setEditingPlanId(null);
                          setIsEditingPlan(true);
                      }}
                      className="bg-slate-900 text-white px-5 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-slate-800"
                  >
                      <Plus size={20} /> Novo Plano
                  </button>
              )}
          </header>

          {isEditingPlan ? (
               <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 max-w-2xl mx-auto">
                   <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                       {editingPlanId ? <Edit2 size={24} className="text-slate-400" /> : <Tag size={24} className="text-slate-400" />}
                       {editingPlanId ? 'Editar Plano' : 'Criar Novo Plano'}
                   </h3>

                   <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Nome do Plano</label>
                               <input 
                                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                  placeholder="Ex: Start, Pro..." 
                                  value={planForm.name || ''}
                                  onChange={e => setPlanForm({...planForm, name: e.target.value})}
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Preço (R$)</label>
                               <input 
                                  type="number"
                                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium" 
                                  placeholder="0.00" 
                                  value={planForm.price ?? ''}
                                  onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})}
                               />
                           </div>
                       </div>

                       <div>
                           <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Características (Features)</label>
                           <div className="flex gap-2 mb-3">
                               <input 
                                  className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm" 
                                  placeholder="Adicionar benefício (ex: Agenda Ilimitada)"
                                  value={featureInput}
                                  onChange={e => setFeatureInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                               />
                               <button onClick={handleAddFeature} className="bg-slate-200 text-slate-600 p-3 rounded-xl font-bold hover:bg-slate-300">
                                   <Plus size={20} />
                               </button>
                           </div>
                           <div className="space-y-2">
                               {planForm.features?.map((feature, idx) => (
                                   <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                       <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                           <CheckCircle2 size={16} className="text-emerald-500" /> {feature}
                                       </span>
                                       <button onClick={() => handleRemoveFeature(idx)} className="text-slate-400 hover:text-red-500">
                                           <X size={16} />
                                       </button>
                                   </div>
                               ))}
                               {(!planForm.features || planForm.features.length === 0) && (
                                   <p className="text-xs text-slate-400 text-center py-2">Nenhum benefício adicionado.</p>
                               )}
                           </div>
                       </div>

                       <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer" onClick={() => setPlanForm({...planForm, isRecommended: !planForm.isRecommended})}>
                           <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${planForm.isRecommended ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white'}`}>
                               {planForm.isRecommended && <Check size={16} />}
                           </div>
                           <span className="font-bold text-slate-700 text-sm">Destacar como "Mais Escolhido"</span>
                       </div>

                       <div className="flex gap-3 pt-4">
                           <button onClick={() => setIsEditingPlan(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-100 rounded-2xl">Cancelar</button>
                           <button onClick={handleSavePlan} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200">
                               Salvar Plano
                           </button>
                       </div>
                   </div>
               </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {saasPlans.map(plan => (
                      <div key={plan.id} className={`bg-white rounded-[2rem] p-8 shadow-sm border relative flex flex-col ${plan.isRecommended ? 'border-rose-500 shadow-xl shadow-rose-100' : 'border-slate-100'}`}>
                          {plan.isRecommended && (
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                                  Recomendado
                              </div>
                          )}
                          
                          <div className="text-center mb-6">
                              <h3 className="font-bold text-slate-800 text-lg mb-2">{plan.name}</h3>
                              <div className="text-4xl font-black text-slate-900">
                                  R$ {plan.price}<span className="text-lg font-medium text-slate-400">/mês</span>
                              </div>
                          </div>
                          
                          <ul className="space-y-4 mb-8 flex-1">
                              {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                      {feature}
                                  </li>
                              ))}
                          </ul>

                          <div className="flex gap-3 mt-auto pt-6 border-t border-slate-50">
                               <button 
                                  onClick={() => {
                                      setPlanForm(plan);
                                      setEditingPlanId(plan.id);
                                      setIsEditingPlan(true);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-700 rounded-xl font-bold hover:bg-slate-100"
                               >
                                   <Edit2 size={16} /> Editar
                               </button>
                               <button 
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                               >
                                   <Trash2 size={20} />
                               </button>
                          </div>
                      </div>
                  ))}
                  
                  {/* Empty State / Add Card */}
                  <div 
                      onClick={() => {
                          setPlanForm({ features: [] });
                          setEditingPlanId(null);
                          setIsEditingPlan(true);
                      }}
                      className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-slate-300 hover:bg-slate-100 transition-all min-h-[400px]"
                  >
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                          <Plus size={32} />
                      </div>
                      <p className="font-bold text-slate-500">Adicionar Novo Plano</p>
                  </div>
              </div>
          )}
      </div>
  );

  const renderSaaSAdmin = () => {
    // 1. Calculate Aggregated Metrics from ALL tenants
    // Logic: Loop through all tenants, access their specific local storage keys, and sum up.
    
    // Initial global stats
    let totalGlobalClients = 0;
    let totalGlobalEmployees = 0;
    let totalGlobalServicesPerformed = 0;
    let totalGlobalGMV = 0; // Gross Merchandise Value (All transactions in salons)
    
    // Geographic Stats
    const cities: Record<string, number> = {};
    const states: Record<string, number> = {};

    tenants.forEach(tenant => {
        // Build keys for this tenant
        const namespace = tenant.slug;
        
        // Count Clients
        const clientsKey = `${namespace}_clients`;
        const clientsData = localStorage.getItem(clientsKey);
        const tenantClients = clientsData ? JSON.parse(clientsData).length : 0;
        totalGlobalClients += tenantClients;

        // Count Employees
        const empKey = `${namespace}_employees`;
        const empData = localStorage.getItem(empKey);
        const tenantEmps = empData ? JSON.parse(empData).length : 0;
        totalGlobalEmployees += tenantEmps;

        // Count Appointments & Value (GMV)
        const apptsKey = `${namespace}_appointments`;
        const apptsData = localStorage.getItem(apptsKey);
        if (apptsData) {
            const appts: Appointment[] = JSON.parse(apptsData);
            const completed = appts.filter(a => a.status === 'completed');
            totalGlobalServicesPerformed += completed.length;
            totalGlobalGMV += completed.reduce((sum, a) => sum + a.totalPrice, 0);
        }

        // Geography
        if (tenant.city) {
            cities[tenant.city] = (cities[tenant.city] || 0) + 1;
        }
        if (tenant.state) {
            states[tenant.state] = (states[tenant.state] || 0) + 1;
        }
    });

    const activeTenants = tenants.filter(t => t.status === 'active');
    const totalMRR = activeTenants.reduce((acc, curr) => acc + curr.mrr, 0);
    
    // Top Cities Sort
    const sortedCities = Object.entries(cities).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return (
        <div className="space-y-8 animate-fade-in p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Dashboard SaaS</h1>
                    <p className="text-slate-500">Inteligência Global da Plataforma</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-right hidden sm:block">
                        <p className="font-bold text-slate-800 text-sm">Super Admin</p>
                        <p className="text-xs text-emerald-600 font-bold">● Online</p>
                     </div>
                     <button onClick={() => setView(ViewState.SAAS_PLANS)} className="text-sm font-bold text-slate-600 bg-white border border-slate-200 shadow-sm px-5 py-2.5 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <CreditCard size={16} /> Gerenciar Planos
                    </button>
                    <button onClick={handleAdminLogout} className="text-sm font-bold text-rose-600 bg-rose-50 px-5 py-2.5 rounded-full hover:bg-rose-100 transition-colors">
                        Sair
                    </button>
                </div>
            </header>

            {/* PRIMARY KPIs (Finance & Scale) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-lg shadow-slate-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-xl text-emerald-400">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded-md">+12%</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">MRR (Recorrente)</p>
                    <p className="text-3xl font-black text-white">R$ {totalMRR.toFixed(2)}</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <BarChart3 size={24} />
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">GMV (Volume Total)</p>
                    <p className="text-3xl font-black text-slate-900">R$ {totalGlobalGMV.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Valor transacionado nos salões</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Serviços Prestados</p>
                    <p className="text-3xl font-black text-slate-900">{totalGlobalServicesPerformed}</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                            <Store size={24} />
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Salões Parceiros</p>
                    <p className="text-3xl font-black text-slate-900">{tenants.length}</p>
                </div>
            </div>

            {/* SECONDARY METRICS (Network Size) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Users Stats */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-around">
                     <div className="text-center">
                         <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-2">
                             <User size={24} />
                         </div>
                         <p className="text-2xl font-black text-slate-800">{totalGlobalClients}</p>
                         <p className="text-xs text-slate-400 font-bold uppercase">Clientes Finais</p>
                     </div>
                     <div className="h-12 w-px bg-slate-100"></div>
                     <div className="text-center">
                         <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center text-indigo-500 mx-auto mb-2">
                             <Scissors size={24} />
                         </div>
                         <p className="text-2xl font-black text-slate-800">{totalGlobalEmployees}</p>
                         <p className="text-xs text-slate-400 font-bold uppercase">Profissionais</p>
                     </div>
                </div>

                {/* Geography Stats */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin size={18} className="text-slate-400" />
                        <h3 className="font-bold text-slate-800">Presença Geográfica</h3>
                    </div>
                    <div className="flex gap-4">
                         <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                             <p className="text-xl font-bold text-slate-800">{Object.keys(cities).length}</p>
                             <p className="text-[10px] text-slate-400 uppercase font-bold">Cidades</p>
                         </div>
                         <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                             <p className="text-xl font-bold text-slate-800">{Object.keys(states).length}</p>
                             <p className="text-[10px] text-slate-400 uppercase font-bold">Estados</p>
                         </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Top Cidades</p>
                        <div className="flex gap-2">
                            {sortedCities.map(([city, count]) => (
                                <span key={city} className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                                    {city} <span className="text-rose-500 ml-1">{count}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS SECTION (Mocked with CSS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-64 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" /> Crescimento de Salões
                    </h3>
                    <div className="flex items-end justify-between flex-1 px-2 gap-2">
                        {/* Fake Bars */}
                        {[30, 45, 35, 60, 50, 75, 65, 90, 80, 100].map((h, i) => (
                            <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group hover:bg-emerald-100 transition-colors" style={{height: `${h}%`}}>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded">
                                    {h}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Jan</span>
                        <span>Dez</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-64 flex flex-col">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500" /> Volume de Agendamentos
                    </h3>
                    <div className="flex items-end justify-between flex-1 px-2 gap-2">
                        {/* Fake Bars */}
                        {[20, 30, 50, 40, 60, 55, 70, 85, 90, 95].map((h, i) => (
                            <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group hover:bg-blue-100 transition-colors" style={{height: `${h}%`}}></div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Jan</span>
                        <span>Dez</span>
                    </div>
                </div>
            </div>

            {/* Tenant List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg">Gerenciar Parceiros</h3>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><Search size={20} /></button>
                        <button className="p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800"><Plus size={20} /></button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Salão</th>
                                <th className="px-6 py-4">Localização</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">MRR</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tenants.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{tenant.slug}</p>
                                        <p className="text-xs text-slate-400">{tenant.ownerName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-slate-300" />
                                            <span className="font-medium text-slate-700">{tenant.city}, {tenant.state}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                            tenant.plan === 'Enterprise' ? 'bg-purple-50 text-purple-600' :
                                            tenant.plan === 'Pro' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {tenant.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex w-fit items-center gap-1 ${
                                            tenant.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            {tenant.status === 'active' ? 'Ativo' : 'Cancelado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">
                                        R$ {tenant.mrr.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-800 font-bold text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                            Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    // Modal de Login Admin
    if (showAdminLogin) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
                 {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                     <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover blur-sm" alt="Salon Background" />
                     <div className="absolute inset-0 bg-black/40" />
                </div>
                
                {/* Login Card */}
                <div className="relative z-10 bg-white w-full max-w-sm mx-4 rounded-3xl p-8 shadow-2xl animate-scale-in">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-slate-800">Área do Parceiro</h3>
                        <button onClick={() => setShowAdminLogin(false)} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Senha de Acesso</label>
                            <input 
                                type="password" 
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                                className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-slate-50 font-medium text-lg placeholder:text-slate-300"
                                placeholder="••••••"
                                autoFocus
                            />
                        </div>
                        <button 
                            onClick={handleAdminLogin}
                            className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95 flex justify-center items-center gap-2"
                        >
                            <Lock size={18} />
                            Entrar
                        </button>
                        <p className="text-xs text-center text-slate-400">
                            Senha Salão: <span className="font-mono text-slate-600">admin123</span> <br/>
                            Senha SaaS: <span className="font-mono text-slate-600">saas123</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Modal de Agendamento (Renderiza sobre tudo se houver serviço selecionado)
    const bookingModal = renderBookingModal();
    const checkoutModal = renderCheckoutModal();

    switch (view) {
      case ViewState.SAAS_LP:
        return (
            <>
                {renderSaaS_LP()}
                {bookingModal}
            </>
        );
      
      case ViewState.SAAS_ADMIN:
        return renderSaaSAdmin();

      case ViewState.SAAS_PLANS:
        return renderSaaSPlans();

      case ViewState.MARKETPLACE:
        const salons = getPlatformSalons();
        return (
          <div className="p-4 space-y-6 pb-24 animate-fade-in">
            <header className="flex justify-between items-center py-2 px-2 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Explorar</h2>
                 <button onClick={() => setView(ViewState.SAAS_LP)} className="text-xs font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-full hover:bg-rose-100 transition-colors">
                    Sobre o App
                 </button>
            </header>
            
            <div className="grid grid-cols-1 gap-6">
              {salons.map(salon => (
                <div 
                  key={salon.id} 
                  onClick={() => handleSalonSelect(salon)}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                >
                  <div className="h-48 bg-gray-200 relative overflow-hidden">
                    <img src={salon.coverUrl} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm text-slate-800">
                      <Star size={12} className="text-yellow-400 mr-1 fill-yellow-400" /> {salon.rating}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-1">
                       <h3 className="font-bold text-lg text-slate-800">{salon.name}</h3>
                       <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wide">{salon.category}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-6 flex items-center gap-1.5">
                        <MapPin size={14} />
                        {salon.location}
                    </p>
                    <button className="w-full py-3.5 bg-slate-50 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-rose-600 group-hover:text-white">
                      Ver Salão
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {bookingModal}
          </div>
        );
        
      case ViewState.PUBLIC_SALON:
        return (
            <>
                {renderSalonLandingPage()}
                {bookingModal}
            </>
        );

      case ViewState.DASHBOARD:
        return (
            <>
                {renderDashboard()}
                {checkoutModal}
                {bookingModal}
            </>
        );

      case ViewState.SERVICES:
        return renderServices();
      
      case ViewState.PRODUCTS:
         return renderProducts();

      case ViewState.FINANCE:
        return renderFinance();

      case ViewState.TEAM:
        return renderTeam();

      case ViewState.SETTINGS:
        return renderSettings();

      case ViewState.COUPONS:
         return <EmptyState icon={Percent} title="Cupons" description="Gerencie promoções e descontos." />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Em Construção</h3>
            <p className="text-slate-400 text-sm mb-6">Estamos preparando algo incrível nesta tela.</p>
            <button 
              onClick={() => setView(ViewState.DASHBOARD)} 
              className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm"
            >
              Voltar ao Início
            </button>
          </div>
        );
    }
  };

  const renderSaaS_LP = () => (
    <div className="animate-fade-in bg-slate-50 min-h-screen font-sans">
        {/* Header */}
        <header className="fixed top-0 left-0 w-full bg-white z-50 px-6 py-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
                <div className="bg-rose-600 rounded-lg p-1.5">
                    <Scissors size={18} className="text-white" />
                </div>
                <span className="font-bold text-slate-800 text-lg">BelezaApp <span className="font-light text-slate-400">Pro</span></span>
            </div>
            <button 
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-2 text-slate-600 font-bold text-sm hover:text-rose-600 transition-colors"
            >
                <Lock size={16} />
                Área do Parceiro
            </button>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-16"></div>

        {/* Hero Section */}
        <section className="pt-12 pb-16 px-6 text-center max-w-lg mx-auto">
            <div className="inline-block bg-rose-50 text-rose-500 font-bold px-4 py-1.5 rounded-full uppercase text-[10px] tracking-wider mb-6">
                Software para Salões
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-[1.15]">
                Seu salão com <br />
                <span className="text-rose-500">agendamento</span> <br />
                <span className="text-rose-500">online</span> e gestão <br />
                completa.
            </h1>
            
            <p className="text-lg text-slate-500 mb-10 leading-relaxed max-w-xs mx-auto">
                Encontre os melhores profissionais ou organize seu negócio em um só lugar.
            </p>
            
            <div className="space-y-4">
                {/* CTA Cliente */}
                <div className="relative">
                    <button 
                      onClick={() => setView(ViewState.MARKETPLACE)}
                      className="w-full bg-white text-rose-600 p-4 rounded-full font-bold shadow-lg shadow-slate-100 border border-slate-100 hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg relative z-10"
                    >
                      <Heart size={20} className="fill-rose-600" />
                      Quero me Cuidar
                    </button>
                    {/* Face Pile Mock */}
                    <div className="absolute -top-3 -right-2 z-20 flex -space-x-2">
                        <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=64" alt="User" />
                        <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=64" alt="User" />
                        <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=64" alt="User" />
                    </div>
                </div>

                <div className="text-slate-300 text-sm font-medium">ou</div>
                
                {/* CTA Profissional */}
                <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="w-full bg-slate-900 text-white p-4 rounded-full font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                   <Store size={20} />
                   Sou Profissional
                </button>
            </div>
        </section>

        {/* Features Section (Vertical Stack) */}
        <section className="px-6 pb-20 max-w-lg mx-auto space-y-16">
            <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Globe size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Site Exclusivo</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    Seu salão ganha uma página profissional com link personalizado para enviar no WhatsApp.
                </p>
            </div>

            <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Wallet size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Controle Financeiro</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    Saiba exatamente quanto entra e sai. Controle comissões, despesas e lucro real.
                </p>
            </div>

            <div className="text-center">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Zap size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Inteligência Artificial</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    Descrição de serviços e produtos geradas automaticamente para vender mais.
                </p>
            </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 pb-24 max-w-lg mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Planos para todos os tamanhos</h2>
                <p className="text-slate-500">Escolha o ideal para o seu momento.</p>
            </div>

            <div className="space-y-6">
                {saasPlans.map(plan => (
                    <div key={plan.id} className={`bg-white rounded-[2rem] p-8 relative text-center ${plan.isRecommended ? 'shadow-xl shadow-rose-100 border-2 border-rose-500 scale-105 z-10' : 'shadow-sm border border-slate-100'}`}>
                        {plan.isRecommended && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                                Mais Escolhido
                            </div>
                        )}
                        <h3 className="font-bold text-slate-800 text-lg mb-4 mt-2">{plan.name}</h3>
                        <div className="text-4xl font-black text-slate-900 mb-6">
                            R$ {plan.price}<span className="text-lg font-medium text-slate-400">/mês</span>
                        </div>
                        <ul className="text-left space-y-4 mb-8">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button className={`w-full font-bold py-4 rounded-2xl transition-colors ${plan.isRecommended ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                            Começar Agora
                        </button>
                    </div>
                ))}
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 py-12 px-6 text-center">
            <p className="text-slate-400 text-sm">
                © 2024 BelezaApp SaaS. Todos os direitos reservados.
            </p>
            <button 
                onClick={() => setShowAdminLogin(true)}
                className="mt-4 text-slate-700 text-xs hover:text-white transition-colors"
            >
                Área Restrita
            </button>
        </footer>
    </div>
  );

  const renderSalonLandingPage = () => {
    const employees = getEmployees();
    const settings = getSettings();
    const salonData = getPlatformSalons().find(s => s.slug === (new URLSearchParams(window.location.search).get('salon') || 'barbearia-vintage')) || getPlatformSalons()[0];

    // ABA LOJA: Mostra a lista de produtos
    if (activeClientTab === 'store') {
        return (
            <div className="animate-fade-in bg-white min-h-screen pb-24 px-6 pt-6">
                 <h2 className="text-2xl font-black text-slate-800 mb-2">Loja</h2>
                 <p className="text-slate-500 mb-6">Produtos disponíveis no salão</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                     {products.map(product => (
                         <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                             <div className="h-32 bg-slate-100 relative">
                                 {product.photoUrl ? (
                                    <img src={product.photoUrl} className="w-full h-full object-cover" alt={product.name} />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package /></div>
                                 )}
                             </div>
                             <div className="p-4 flex-1 flex flex-col">
                                 <h3 className="font-bold text-slate-800 text-sm mb-1">{product.name}</h3>
                                 <p className="text-[10px] text-slate-400 line-clamp-2 mb-3 flex-1">{product.description}</p>
                                 <div className="flex justify-between items-center mt-auto">
                                     <span className="font-bold text-slate-900">R$ {product.price}</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
                 {products.length === 0 && (
                     <EmptyState icon={ShoppingBag} title="Loja Vazia" description="Nenhum produto cadastrado no momento." />
                 )}
            </div>
        )
    }

    // ABA CONTA (Novo)
    if (activeClientTab === 'appointments') {
        const today = new Date().toISOString().split('T')[0];
        
        // Se não estiver logado
        if (!clientLoggedInPhone) {
            return (
                <div className="animate-fade-in bg-white min-h-screen pb-24 px-6 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Acessar sua Conta</h2>
                    <p className="text-slate-500 text-center mb-8 max-w-xs">
                        Digite seu telefone para ver seus agendamentos e histórico.
                    </p>
                    <div className="w-full max-w-sm space-y-4">
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="tel" 
                                value={clientLoginInput}
                                onChange={(e) => setClientLoginInput(e.target.value)}
                                placeholder="(11) 99999-9999"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 font-medium"
                            />
                        </div>
                        <button 
                            onClick={handleClientLogin}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                        >
                            Ver Meus Agendamentos
                        </button>
                    </div>
                </div>
            )
        }

        // Se estiver logado
        const myAppointments = appointments.filter(app => app.clientId === clientLoggedInPhone || app.clientName.includes(clientLoggedInPhone)); // Fallback check
        const futureAppointments = myAppointments.filter(app => app.date >= today && app.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date));
        const pastAppointments = myAppointments.filter(app => app.date < today || app.status === 'completed' || app.status === 'cancelled').sort((a, b) => b.date.localeCompare(a.date));
        const clientInfo = clients.find(c => c.phone === clientLoggedInPhone);

        return (
            <div className="animate-fade-in bg-white min-h-screen pb-24 px-6 pt-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Olá, {clientInfo?.name.split(' ')[0] || 'Cliente'}</h2>
                        <p className="text-xs text-slate-500">Acompanhe sua agenda aqui.</p>
                    </div>
                    <button onClick={() => setClientLoggedInPhone(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500">
                        <LogOut size={18} />
                    </button>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <CalendarDays size={18} className="text-rose-500" /> Próximos
                </h3>
                <div className="space-y-4 mb-8">
                    {futureAppointments.length > 0 ? futureAppointments.map(app => (
                        <div key={app.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-start mb-4">
                                 <div className="flex gap-3">
                                     <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-bold text-sm">
                                         {app.date.split('-')[2]}
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-800">{app.serviceName}</h4>
                                         <p className="text-xs text-slate-500">às {app.time} com {app.employeeName}</p>
                                     </div>
                                 </div>
                                 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                     Confirmado
                                 </span>
                             </div>
                             {app.products && app.products.length > 0 && (
                                 <div className="mb-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl">
                                     + {app.products.length} produtos adicionados
                                 </div>
                             )}
                             <button 
                                onClick={() => handleCancelAppointment(app.id)}
                                className="w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                             >
                                 Cancelar Agendamento
                             </button>
                        </div>
                    )) : (
                        <div className="bg-slate-50 rounded-2xl p-6 text-center">
                            <p className="text-sm text-slate-500 mb-2">Você não tem agendamentos futuros.</p>
                            <button onClick={() => setActiveClientTab('home')} className="text-xs font-bold text-rose-600">Agendar Agora</button>
                        </div>
                    )}
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <History size={18} className="text-slate-400" /> Histórico
                </h3>
                <div className="space-y-4 opacity-75">
                     {pastAppointments.length > 0 ? pastAppointments.map(app => (
                        <div key={app.id} className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm">{app.serviceName}</h4>
                                <p className="text-xs text-slate-400">{app.date.split('-').reverse().join('/')} • {app.time}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                app.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                app.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : 'Passado'}
                            </span>
                        </div>
                    )) : (
                        <p className="text-center text-sm text-slate-400 py-4">Nenhum histórico disponível.</p>
                    )}
                </div>
            </div>
        );
    }

    // ABA INÍCIO (Capa, Serviços, etc)
    return (
      <div className="animate-fade-in bg-white min-h-screen pb-24">
        {/* Immersive Header */}
        <div className="relative h-[40vh] w-full">
            <img 
                src={salonData.coverUrl} 
                alt="Capa do Salão" 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>
            
            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 w-full p-6 pt-safe flex justify-between items-start z-20">
                {!isDirectLink ? (
                    <button 
                        onClick={() => setView(ViewState.MARKETPLACE)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/30 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : <div className="w-10"></div>}

                <div className="flex gap-3">
                    <button 
                        onClick={handleShare}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <Share2 size={18} />
                    </button>
                    <button 
                        onClick={() => setShowAdminLogin(true)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <Lock size={16} />
                    </button>
                </div>
            </div>

            {/* Salon Intro Card */}
            <div className="absolute bottom-0 left-0 w-full translate-y-8 px-6 z-10">
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wide mb-2 inline-block">
                                {salonData.category}
                            </span>
                            <h1 className="text-2xl font-bold text-slate-800 leading-tight">{settings.shopName}</h1>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl w-14 h-14 border border-slate-100">
                            <span className="font-bold text-slate-900 text-lg">{salonData.rating}</span>
                            <div className="flex text-yellow-400 text-[8px]">★★★★★</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                        <MapPin size={16} className="text-rose-400 shrink-0" />
                        <span className="truncate">{salonData.location}</span>
                    </div>

                    {/* Floating Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-colors">
                            <Phone size={18} /> WhatsApp
                        </button>
                        <button className="flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors">
                            <MapPin size={18} /> Ver Rota
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="h-12"></div> {/* Spacer for the overlapping card */}

        {/* Team Section */}
        <section className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Nossos Profissionais</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
                {employees.map(employee => (
                    <div key={employee.id} className="min-w-[140px] flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-rose-400 to-purple-500 mb-3">
                            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-100 relative">
                                {employee.photoUrl ? (
                                    <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-full h-full p-6 text-slate-300" />
                                )}
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm text-center">{employee.name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wide">{employee.role}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Services List */}
        <section className="px-6 pb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Menu de Serviços</h2>
            <div className="space-y-4">
                {services.map(service => (
                    <div key={service.id} className="group bg-white rounded-3xl p-1 border border-slate-100 hover:border-rose-100 hover:shadow-lg hover:shadow-rose-100/50 transition-all duration-300">
                        <div className="flex items-center p-4 gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                                <Scissors size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 truncate">{service.name}</h3>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{service.duration} min • {service.description}</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-900 mb-1">R$ {service.price}</span>
                                <button 
                                  onClick={() => openBookingModal(service)}
                                  className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-rose-600 transition-colors"
                                >
                                    Agendar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
        
        {/* Info Box */}
        <section className="px-6 mb-8">
            <div className="bg-slate-50 rounded-[2rem] p-6 flex items-start gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-rose-500">
                    <Clock size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">Horário de Funcionamento</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Segunda a Sexta: <span className="text-slate-700 font-medium">{settings.openTime} às {settings.closeTime}</span><br/>
                        Sábado: <span className="text-slate-700 font-medium">09:00 às 14:00</span>
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-white px-3 py-1 rounded-full shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aberto Agora
                    </div>
                </div>
            </div>
        </section>
      </div>
    );
  };

  const renderBookingModal = () => {
    if (!selectedServiceForBooking) return null;

    const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
    const productsTotal = bookingCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const grandTotal = selectedServiceForBooking.price + productsTotal;

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeBookingModal} />
        
        <div className="relative bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">
              {bookingStep === 1 && 'Escolha o Profissional'}
              {bookingStep === 2 && 'Deseja algo mais?'}
              {bookingStep === 3 && 'Escolha o Horário'}
              {bookingStep === 4 && 'Seus Dados'}
              {bookingStep === 5 && 'Agendado!'}
            </h3>
            <button onClick={closeBookingModal} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {bookingStep === 1 && (
             <div className="space-y-4">
                 <p className="text-sm text-slate-500">Selecione quem fará o seu atendimento.</p>
                 <div className="space-y-3">
                     {employees.map(employee => (
                         <div 
                            key={employee.id}
                            onClick={() => {
                                setSelectedEmployeeForBooking(employee);
                                setBookingStep(2);
                            }}
                            className="flex items-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-rose-500 hover:shadow-rose-100 transition-all cursor-pointer group"
                         >
                            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-rose-400 to-purple-500 mr-4">
                                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-100 relative">
                                    {employee.photoUrl ? (
                                        <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-full h-full p-3 text-slate-300" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">{employee.name}</h4>
                                <p className="text-xs text-slate-400">{employee.role}</p>
                            </div>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-rose-500">
                                <ChevronRight />
                            </div>
                         </div>
                     ))}
                 </div>
             </div>
          )}

          {bookingStep === 2 && (
            <div className="space-y-6">
                <p className="text-sm text-slate-500">Aproveite para levar produtos da nossa loja.</p>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {products.map(product => {
                        const cartItem = bookingCart.find(item => item.product.id === product.id);
                        const qty = cartItem ? cartItem.quantity : 0;
                        return (
                            <div key={product.id} className={`flex items-center p-3 rounded-2xl border transition-all ${qty > 0 ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white'}`}>
                                <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden shrink-0 mr-3">
                                    {product.photoUrl && <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm">{product.name}</h4>
                                    <p className="text-xs text-slate-500">R$ {product.price}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {qty > 0 && (
                                        <>
                                            <button 
                                                onClick={() => updateBookingQuantity(product, -1)}
                                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="font-bold text-slate-900 text-sm w-4 text-center">{qty}</span>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => updateBookingQuantity(product, 1)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${qty > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {products.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhum produto disponível.</p>}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <div>
                        <span className="text-xs text-slate-400 block">Total estimado</span>
                        <span className="text-lg font-black text-slate-900">R$ {grandTotal}</span>
                    </div>
                    <button 
                        onClick={() => setBookingStep(3)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800"
                    >
                        {bookingCart.length > 0 ? 'Continuar' : 'Pular'}
                    </button>
                </div>
            </div>
          )}

          {bookingStep === 3 && (
            <div className="space-y-6">
               <div className="bg-rose-50 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-xl text-rose-500 shadow-sm">
                        <Scissors size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{selectedServiceForBooking.name}</h4>
                        <p className="text-xs text-slate-500">
                            com <span className="font-bold">{selectedEmployeeForBooking?.name}</span> • R$ {selectedServiceForBooking.price}
                        </p>
                      </div>
                  </div>
                  {bookingCart.length > 0 && (
                      <div className="pt-3 border-t border-rose-100/50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Produtos Selecionados</p>
                          <div className="space-y-1">
                              {bookingCart.map(item => (
                                  <div key={item.product.id} className="flex justify-between text-xs text-slate-600">
                                      <span>{item.quantity}x {item.product.name}</span>
                                      <span className="font-bold">R$ {item.product.price * item.quantity}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                 <input 
                    type="date" 
                    value={bookingDate} 
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                 />
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Horários Disponíveis</label>
                 <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => setBookingTime(time)}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${
                          bookingTime === time 
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 scale-105' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                 </div>
               </div>
               
               <div className="flex gap-3 mt-4">
                   <button 
                      onClick={() => setBookingStep(2)}
                      className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-600"
                   >
                     Voltar
                   </button>
                   <button 
                      disabled={!bookingTime || !bookingDate}
                      onClick={() => setBookingStep(4)}
                      className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                   >
                     Continuar
                   </button>
               </div>
            </div>
          )}

          {bookingStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Seu Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="tel" 
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>
                  {clientPhone.length > 0 && clientPhone.length < 8 && <p className="text-xs text-rose-500 mt-1 ml-1">Digite um telefone válido para verificar cadastro.</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Seu Nome</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      // If user is found, name is auto-filled. Can be edited, but usually not needed.
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>
                </div>

                {/* Date of Birth field - Only if NEW CLIENT */}
                {isNewClient && (
                    <div className="animate-fade-in bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-2 mb-2">
                             <AlertCircle size={16} className="text-rose-500" />
                             <label className="text-sm font-bold text-slate-800">Primeiro Acesso?</label>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">Complete seu cadastro informando sua data de nascimento.</p>
                        <input 
                            type="date" 
                            value={clientBirthDate}
                            onChange={(e) => setClientBirthDate(e.target.value)}
                            className="w-full p-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        />
                    </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                 <div className="flex justify-between text-sm text-slate-500">
                    <span>Serviço</span>
                    <span>{selectedServiceForBooking.name}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-500">
                    <span>Profissional</span>
                    <span>{selectedEmployeeForBooking?.name}</span>
                 </div>
                 {bookingCart.length > 0 && (
                     <div className="pt-2 mt-2 border-t border-slate-200">
                        {bookingCart.map(item => (
                            <div key={item.product.id} className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>{item.quantity}x {item.product.name}</span>
                                <span>R$ {item.product.price * item.quantity}</span>
                            </div>
                        ))}
                     </div>
                 )}
                 <div className="flex justify-between text-sm text-slate-500 pt-2 border-t border-slate-200">
                    <span>Data e Hora</span>
                    <span>{bookingDate.split('-').reverse().join('/')} às {bookingTime}</span>
                 </div>
                 <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800">
                    <span>Total</span>
                    <span>R$ {grandTotal}</span>
                 </div>
              </div>

              <button 
                  onClick={confirmBooking}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
               >
                 Confirmar Agendamento
               </button>
               <button 
                  onClick={() => setBookingStep(3)}
                  className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600"
               >
                 Voltar
               </button>
            </div>
          )}

          {bookingStep === 5 && (
            <div className="text-center py-8">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                 <CheckCircle2 size={40} />
               </div>
               <h4 className="text-2xl font-black text-slate-800 mb-2">Agendamento Confirmado!</h4>
               <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                 Te esperamos no dia <span className="font-bold text-slate-700">{bookingDate.split('-').reverse().join('/')}</span> às <span className="font-bold text-slate-700">{bookingTime}</span> com <span className="font-bold text-slate-700">{selectedEmployeeForBooking?.name}</span>.
               </p>
               <button 
                  onClick={closeBookingModal}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors"
               >
                 Fechar
               </button>
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderCheckoutModal = () => {
      if (!checkoutAppointment) return null;

      // Group existing products from appointment (flattened list to counts)
      const existingProductCounts: Record<string, number> = {};
      (checkoutAppointment.products || []).forEach(p => {
          existingProductCounts[p.id] = (existingProductCounts[p.id] || 0) + 1;
      });
      const uniqueExistingProducts = Array.from(new Set((checkoutAppointment.products || []).map(p => p.id)))
        .map(id => checkoutAppointment.products!.find(p => p.id === id)!);


      const newProductsTotal = checkoutCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const grandTotal = checkoutAppointment.totalPrice + newProductsTotal;

      return (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeCheckoutModal} />
            <div className="relative bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Finalizar Atendimento</h3>
                    <button onClick={closeCheckoutModal} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Client Summary */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold text-lg">
                            {checkoutAppointment.clientName?.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">{checkoutAppointment.clientName}</h4>
                            <p className="text-xs text-slate-500">{checkoutAppointment.serviceName}</p>
                        </div>
                    </div>

                    {/* Products Add Section */}
                    <div>
                        <h5 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                            <ShoppingBag size={16} /> Adicionar Produtos (Checkout)
                        </h5>
                        <div className="bg-slate-50 rounded-2xl p-2 space-y-2 max-h-[150px] overflow-y-auto">
                            {products.map(product => {
                                const cartItem = checkoutCart.find(item => item.product.id === product.id);
                                const qty = cartItem ? cartItem.quantity : 0;
                                return (
                                    <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            {product.photoUrl && <img src={product.photoUrl} className="w-8 h-8 rounded-lg object-cover" />}
                                            <div className="text-xs">
                                                <p className="font-bold text-slate-800">{product.name}</p>
                                                <p className="text-slate-500">R$ {product.price}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {qty > 0 && (
                                                <>
                                                    <button 
                                                        onClick={() => updateCheckoutQuantity(product, -1)}
                                                        className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-800 w-3 text-center">{qty}</span>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => updateCheckoutQuantity(product, 1)} 
                                                className={`w-6 h-6 rounded-full flex items-center justify-center hover:opacity-90 ${qty > 0 ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Totals */}
                     <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Serviço Original</span>
                            <span>R$ {checkoutAppointment.price}</span>
                        </div>
                        {uniqueExistingProducts.length > 0 && (
                             <div className="pt-1 border-t border-slate-200/50 mt-1">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Agendados</p>
                                {uniqueExistingProducts.map(p => (
                                    <div key={p.id} className="flex justify-between text-xs text-slate-500">
                                        <span>{existingProductCounts[p.id]}x {p.name}</span>
                                        <span>R$ {p.price * existingProductCounts[p.id]}</span>
                                    </div>
                                ))}
                             </div>
                        )}
                         {checkoutCart.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/50 mt-1">
                                <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Adicionados Agora</p>
                                {checkoutCart.map(item => (
                                    <div key={item.product.id} className="flex justify-between text-xs text-emerald-600 font-medium">
                                        <span>{item.quantity}x {item.product.name}</span>
                                        <span>R$ {item.product.price * item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-lg font-black text-slate-800">
                            <span>Total Final</span>
                            <span>R$ {grandTotal}</span>
                        </div>
                    </div>

                    <button 
                        onClick={finalizeCheckout}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                    >
                        <DollarSign size={20} /> Confirmar Pagamento
                    </button>
                </div>
            </div>
          </div>
      )
  }

  return (
    <Layout 
      currentView={view} 
      setView={setView} 
      salonName={salonName}
      activeClientTab={activeClientTab}
      onClientTabChange={setActiveClientTab}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
