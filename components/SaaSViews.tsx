
import React from 'react';
import { Scissors, Heart, Globe, Wallet, Zap, CheckCircle2, Search, User, ChevronRight, Star, MapPin, Map, Edit2, Trash2, Plus, X } from 'lucide-react';
import { ViewState, SalonMetadata, SaasPlan, Tenant } from '../types';

// --- PROPS INTERFACES ---

interface SaaS_LP_Props {
  setView: (view: ViewState) => void;
  setShowAdminLogin: (show: boolean) => void;
  saasPlans: SaasPlan[];
}

interface MarketplaceProps {
  platformSalons: SalonMetadata[];
  randomSalons: SalonMetadata[];
  showAllSalons: boolean;
  setShowAllSalons: (show: boolean) => void;
  handleSalonSelect: (salon: SalonMetadata) => void;
}

interface SaaSAdminProps {
  tenants: Tenant[];
  saasTab: 'overview' | 'partners' | 'plans';
  setSaasTab: (tab: 'overview' | 'partners' | 'plans') => void;
  handleAdminLogout: () => void;
  saasPlans: SaasPlan[];
  isEditingPlan: boolean;
  setIsEditingPlan: (val: boolean) => void;
  planForm: Partial<SaasPlan>;
  setPlanForm: React.Dispatch<React.SetStateAction<Partial<SaasPlan>>>;
  setEditingPlanId: (id: string | null) => void;
  featureInput: string;
  setFeatureInput: (val: string) => void;
  handleAddFeature: () => void;
  handleRemoveFeature: (idx: number) => void;
  handleSavePlan: () => void;
  handleDeletePlan: (id: string) => void;
}

// --- COMPONENTS ---

export const SaaS_LP: React.FC<SaaS_LP_Props> = ({ setView, setShowAdminLogin, saasPlans }) => {
  return (
      <div className="bg-white min-h-screen pb-20">
          {/* Header */}
          <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white"><Scissors size={18}/></div>
                  <span className="font-bold text-slate-800 text-lg">SALÃO ONLINE <span className="text-rose-600 font-black">Pro</span></span>
               </div>
          </header>

          {/* Hero */}
          <section className="px-6 pt-12 pb-20 text-center space-y-6">
               <span className="inline-block px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-wider">Software para Salões</span>
               <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-[1.1]">
                   Seu salão com <span className="text-rose-600">agendamento online</span> e gestão <span className="text-slate-900">completa</span>.
               </h1>
               <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                   Chega de papel, agenda lotada e confusão no atendimento. Com nossa plataforma, seu salão ganha organização, profissionalismo e mais clientes.
               </p>

               <div className="flex flex-col gap-4 max-w-xs mx-auto pt-4">
                   <button 
                     onClick={() => setView(ViewState.MARKETPLACE)} // Client Action
                     className="w-full bg-white border border-slate-200 py-4 rounded-full font-bold text-slate-800 shadow-xl shadow-slate-100 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 relative overflow-hidden"
                   >
                       <Heart className="text-rose-500 fill-rose-500" size={20}/>
                       <span>Já aderiram</span>
                       {/* Facepile */}
                       <div className="flex -space-x-2 absolute right-4">
                          {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>)}
                       </div>
                   </button>
                   
                   <p className="text-xs text-slate-300 font-bold uppercase my-1">ou</p>

                   <button 
                      onClick={() => document.getElementById('plans')?.scrollIntoView({behavior: 'smooth'})}
                      className="w-full bg-rose-600 text-white py-4 rounded-full font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 transition-colors"
                   >
                       Eu Quero
                   </button>
                   
                   {/* Social Login - NOVO DESIGN (Google Branco) */}
                   <button className="w-full bg-white border border-slate-200 py-3 rounded-full font-bold text-slate-600 text-sm flex items-center justify-center gap-2 mt-2 shadow-sm hover:bg-slate-50 transition-colors">
                       <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                       </svg>
                       Continuar com Google
                   </button>

                   {/* Store Badges - NOVO DESIGN (Transparente + Em Breve) */}
                   <div className="flex flex-col items-center pt-6 opacity-40 hover:opacity-60 transition-opacity">
                       <div className="flex justify-center gap-3 grayscale">
                           <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                               <div className="text-[10px] text-left leading-tight">Download on the<br/><span className="text-sm font-bold">App Store</span></div>
                           </button>
                           <button className="bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                               <div className="text-[10px] text-left leading-tight">GET IT ON<br/><span className="text-sm font-bold">Google Play</span></div>
                           </button>
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">EM BREVE</p>
                   </div>
               </div>
          </section>

          {/* Features */}
          <section className="px-6 py-12 bg-slate-50">
              <h2 className="text-center font-bold text-slate-800 text-xl mb-2">Site Exclusivo</h2>
              <p className="text-center text-slate-500 text-sm mb-12 max-w-xs mx-auto">Seu salão ganha uma página profissional com link personalizado.</p>
              
              <div className="space-y-12 max-w-md mx-auto">
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-blue-100 rounded-[1.5rem] flex items-center justify-center text-blue-600 mx-auto mb-4"><Globe size={32}/></div>
                      <h3 className="font-bold text-slate-800">Agendamento 24h</h3>
                      <p className="text-slate-500 text-sm">Seu cliente agenda pelo celular sem te chamar no WhatsApp.</p>
                  </div>
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 mx-auto mb-4"><Wallet size={32}/></div>
                      <h3 className="font-bold text-slate-800">Controle Financeiro</h3>
                      <p className="text-slate-500 text-sm">Saiba exatamente quanto entra e sai. Controle comissões e lucro.</p>
                  </div>
                  <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-purple-100 rounded-[1.5rem] flex items-center justify-center text-purple-600 mx-auto mb-4"><Zap size={32}/></div>
                      <h3 className="font-bold text-slate-800">Inteligência Artificial</h3>
                      <p className="text-slate-500 text-sm">Descrições automáticas e insights para vender mais.</p>
                  </div>
              </div>
          </section>

          {/* Pricing */}
          <section id="plans" className="px-6 py-12">
              <h2 className="text-center font-bold text-slate-800 text-2xl mb-2">Planos para todos</h2>
              <p className="text-center text-slate-500 text-sm mb-8">Escolha o ideal para o seu momento.</p>
              
              <div className="space-y-6 max-w-sm mx-auto">
                  {saasPlans.sort((a,b) => (a.price || 0) - (b.price || 0)).map(plan => {
                      const isRecommended = plan.isRecommended;
                      const isFree = plan.basePrice === 0 && (!plan.pricePerUser || plan.pricePerUser === 0);
                      const isDynamic = plan.pricePerUser && plan.pricePerUser > 0;

                      return (
                          <div key={plan.id} className={`p-8 rounded-[2.5rem] text-center relative overflow-hidden ${isRecommended ? 'bg-white border-2 border-rose-100 shadow-xl shadow-rose-100/50' : 'bg-slate-50 border border-slate-100'}`}>
                              {isRecommended && (
                                  <>
                                      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                                      <span className="inline-block px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full mb-4 absolute top-4 right-4">Mais Escolhido</span>
                                  </>
                              )}
                              
                              <h3 className="font-bold text-slate-800 mb-2 mt-2">{plan.name}</h3>
                              
                              <div className="mb-6">
                                  <p className="text-4xl font-black text-slate-900">
                                      R$ {plan.basePrice}
                                      <span className="text-sm text-slate-400 font-medium">/mês</span>
                                  </p>
                                  {isDynamic && (
                                      <p className="text-sm font-bold text-rose-500 mt-1">
                                          + R$ {plan.pricePerUser} <span className="text-slate-400 font-normal">por profissional</span>
                                      </p>
                                  )}
                                  {plan.minUsers && plan.minUsers > 0 ? (
                                      <p className="text-[10px] bg-slate-200 text-slate-600 inline-block px-2 py-1 rounded-full mt-2 font-bold uppercase tracking-wide">
                                          Acima de {plan.minUsers - 1} profissionais
                                      </p>
                                  ) : null}
                              </div>

                              <ul className="space-y-3 text-sm text-left mb-8">
                                  {plan.features.map((feat, idx) => (
                                      <li key={idx} className="flex gap-2">
                                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> {feat}
                                      </li>
                                  ))}
                              </ul>
                              <button onClick={() => setShowAdminLogin(true)} className={`w-full py-4 rounded-2xl font-bold transition-colors ${isRecommended ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                                  {isFree ? 'Começar Agora' : 'Assinar Agora'}
                              </button>
                          </div>
                      );
                  })}
              </div>
          </section>

          <footer className="bg-slate-900 text-slate-500 py-12 text-center text-sm">
              <p className="mb-4">© 2024 BelezaApp SaaS. Todos os direitos reservados.</p>
              <button onClick={() => setShowAdminLogin(true)} className="text-slate-700 hover:text-white transition-colors text-xs uppercase font-bold tracking-widest">Área Restrita</button>
          </footer>
      </div>
  );
};

export const Marketplace: React.FC<MarketplaceProps> = ({ platformSalons, randomSalons, showAllSalons, setShowAllSalons, handleSalonSelect }) => {
  return (
      <div className="pb-24">
         <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 shadow-sm">
             <h1 className="text-lg font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-tight">SALÃO ONLINE</h1>
             <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><User size={16} className="text-slate-400"/></div>
         </header>

         <div className="p-4 space-y-6">
             {/* Search */}
             <div className="relative">
                 <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                 <input className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm" placeholder="Buscar salão ou serviço..."/>
             </div>

             {/* Categories */}
             <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                 {['Todos', 'Barbearia', 'Salão', 'Manicure', 'Spa'].map((cat, i) => (
                     <button key={cat} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap ${i===0 ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}>
                         {cat}
                     </button>
                 ))}
             </div>

             {/* Featured Salons (Random 3) */}
             <div>
                 <h2 className="font-bold text-slate-800 mb-4 px-2">Em Destaque</h2>
                 <div className="space-y-4">
                     {(showAllSalons ? platformSalons : randomSalons.slice(0, 3)).map(salon => (
                         <div 
                           key={salon.id} 
                           onClick={() => handleSalonSelect(salon)}
                           className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:border-rose-100 transition-colors group"
                         >
                             <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0"><img src={salon.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div>
                             <div className="flex-1 py-1">
                                 <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide bg-rose-50 px-2 py-1 rounded-md mb-2 inline-block">{salon.category}</span>
                                 <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{salon.name}</h3>
                                 <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
                                     <MapPin size={12}/> {salon.location}
                                 </div>
                                 <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                     <Star className="text-yellow-400 fill-yellow-400" size={14}/> {salon.rating}
                                     <span className="text-slate-300 mx-1">•</span>
                                     <span className="text-emerald-600">Aberto agora</span>
                                 </div>
                             </div>
                             <div className="flex items-center justify-center pr-2 text-slate-300">
                                 <ChevronRight />
                             </div>
                         </div>
                     ))}
                 </div>
                 
                 {!showAllSalons && (
                    <button onClick={() => setShowAllSalons(true)} className="w-full py-3 mt-4 text-slate-500 text-sm font-bold bg-white border border-slate-100 rounded-2xl">
                        Ver Lista Completa
                    </button>
                 )}
             </div>
         </div>
      </div>
  );
};

export const SaaSAdmin: React.FC<SaaSAdminProps> = ({ 
    tenants, saasTab, setSaasTab, handleAdminLogout, saasPlans, isEditingPlan, setIsEditingPlan, 
    planForm, setPlanForm, setEditingPlanId, featureInput, setFeatureInput, handleAddFeature, 
    handleRemoveFeature, handleSavePlan, handleDeletePlan 
}) => {
    const totalTenants = tenants.length;
    const totalMRR = tenants.reduce((acc, t) => acc + (t.mrr || 0), 0);
    const totalGlobalGMV = tenants.length * 4500; 
    const topCities = tenants.reduce((acc: any, t) => {
        acc[t.city] = (acc[t.city] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="pb-24">
            <header className="bg-rose-600 text-white pt-6 pb-6 px-6 sticky top-0 z-30 shadow-lg shadow-rose-200">
                 <div className="flex justify-between items-center mb-4">
                     <h1 className="text-xl font-bold">Admin SaaS Pro</h1>
                     <button onClick={handleAdminLogout} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">Sair</button>
                 </div>
                 {/* Mobile Tabs */}
                 <div className="flex bg-rose-700 p-1 rounded-xl">
                     <button onClick={()=>setSaasTab('overview')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'overview' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Visão Geral</button>
                     <button onClick={()=>setSaasTab('partners')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'partners' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Parceiros</button>
                     <button onClick={()=>setSaasTab('plans')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${saasTab === 'plans' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-100 hover:bg-rose-600/50'}`}>Planos</button>
                 </div>
            </header>

            <div className="p-4 space-y-6">
                {saasTab === 'overview' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase">MRR (Recorrente)</p>
                                <p className="text-2xl font-black text-slate-800">R$ {totalMRR.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase">GMV (Transacionado)</p>
                                <p className="text-2xl font-black text-emerald-600">R$ {totalGlobalGMV.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Map size={18}/> Cobertura Geográfica</h3>
                            <div className="space-y-3">
                                {Object.entries(topCities).map(([city, count]: any) => (
                                    <div key={city} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{city}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 bg-slate-100 w-24 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500" style={{ width: `${(count / totalTenants) * 100}%` }}></div>
                                            </div>
                                            <span className="font-bold text-slate-800">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {saasTab === 'partners' && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Salão</th>
                                    <th className="p-4">Plano</th>
                                    <th className="p-4">Cidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tenants.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">{t.slug}</p>
                                            <p className="text-xs text-slate-400">{t.ownerName}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{t.plan}</span>
                                        </td>
                                        <td className="p-4 text-slate-600">{t.city}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {saasTab === 'plans' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Gerenciar Planos</h3>
                            <button onClick={() => { setPlanForm({ features: [] }); setEditingPlanId(null); setIsEditingPlan(true); }} className="bg-rose-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-lg shadow-rose-200">Novo Plano</button>
                        </div>
                        {isEditingPlan ? (
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                                <input className="w-full p-3 bg-slate-50 rounded-xl" placeholder="Nome do Plano" value={planForm.name || ''} onChange={e=>setPlanForm({...planForm, name: e.target.value})}/>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">Valor Base (R$)</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="29.90" value={planForm.basePrice || ''} onChange={e=>setPlanForm({...planForm, basePrice: Number(e.target.value)})}/></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">Por Profissional (R$)</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="10.00" value={planForm.pricePerUser || ''} onChange={e=>setPlanForm({...planForm, pricePerUser: Number(e.target.value)})}/></div>
                                </div>
                                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">Mínimo de Profissionais (Gatilho)</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl" placeholder="0 (Todos) ou 11 (Só grandes)" value={planForm.minUsers || 0} onChange={e=>setPlanForm({...planForm, minUsers: Number(e.target.value)})}/></div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400">Benefícios:</p>
                                    {planForm.features?.map((feat, idx) => (
                                        <div key={idx} className="flex justify-between bg-slate-50 p-2 rounded text-sm"><span>{feat}</span><button onClick={()=>handleRemoveFeature(idx)} className="text-red-500"><X size={14}/></button></div>
                                    ))}
                                    <div className="flex gap-2"><input className="flex-1 p-2 bg-slate-50 rounded text-sm" placeholder="Novo benefício..." value={featureInput} onChange={e=>setFeatureInput(e.target.value)}/><button onClick={handleAddFeature} className="bg-slate-200 text-slate-600 p-2 rounded"><Plus size={16}/></button></div>
                                </div>
                                <div className="flex gap-3 pt-2"><button onClick={()=>setIsEditingPlan(false)} className="flex-1 py-2 text-slate-400 font-bold text-sm">Cancelar</button><button onClick={handleSavePlan} className="flex-1 bg-emerald-500 text-white rounded-xl font-bold text-sm">Salvar</button></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {saasPlans.map(plan => (
                                    <div key={plan.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{plan.name}</h4>
                                            <p className="text-sm font-black text-rose-600">R$ {plan.basePrice} <span className="text-slate-400 font-medium text-xs">+ R$ {plan.pricePerUser}/prof</span></p>
                                            <p className="text-[10px] text-slate-400 mt-1">{plan.minUsers && plan.minUsers > 0 ? `Mínimo de ${plan.minUsers} profissionais` : 'Para qualquer tamanho'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setPlanForm(plan); setEditingPlanId(plan.id); setIsEditingPlan(true); }} className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
