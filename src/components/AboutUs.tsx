import React from 'react';
import { Heart, MapPin, CheckCircle2, Phone } from 'lucide-react';
import { PHONE_NUMBER, SHOWROOM_ADDRESS } from '../data/transits';
import salonFoto from '../assets/images/Salonfoto.jpg';

export const AboutUs: React.FC = () => {
  return (
    <section id="haqqimizda" className="py-16 md:py-20 bg-[#F8FAFC] text-slate-800 border-b border-slate-200 scroll-mt-20 sm:scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white p-2">
              <div className="relative rounded-xl overflow-hidden bg-slate-900">
                <img
                  src={salonFoto}
                  alt="Məkanımız - Kosalar Auto"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-[360px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-lg font-bold">Məkanımız</p>
                  <p className="text-xs text-slate-300">{SHOWROOM_ADDRESS}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Text Content */}
          <div className="lg:col-span-7 space-y-5">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-black border border-blue-200">
              <Heart className="w-3.5 h-3.5 text-[#1D4ED8] fill-current" />
              <span>Müştərilərimiz üçün</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight leading-tight">
              Dürüstlük və keyfiyyət prinsipi ilə xidmətinizdəyik
            </h2>

            <p className="text-slate-700 text-base leading-relaxed font-semibold">
              Şirkətin çalışanları: <b>Ramiq bəy, Natiq bəy, Faiq bəy, Barat bəy.</b>
            </p>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
              Biz yüksək məsuliyyət və dürüstlük prinsipi ilə çalışırıq. Yeni Günəşlidəki satış meydançamızda olan hər bir Ford Transit şəxsən təcrübəli ustalarımızın ətraflı yoxlamasından keçir. Avtomobilin mühərrikində, transmissiyasında və ya kuzovunda nə vəziyyət var olduğu kimi müştəriyə bildirilir.
            </p>

            {/* Core Values Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#0F172A] text-sm block">100% şəffaf tarixçə</span>
                  <span className="text-xs text-slate-500">Yürüşünə və vuruqsuzluğuna cavabdehlik</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#0F172A] text-sm block">Usta baxışına açıq</span>
                  <span className="text-xs text-slate-500">Öz ustanızı gətirib istədiyiniz kimi yoxlayın</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#0F172A] text-sm block">Gömrük və texpasport</span>
                  <span className="text-xs text-slate-500">Sənədlər dərhal adınıza rəsmiləşdirilir</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#0F172A] text-sm block">Şəffaf qiymətlər</span>
                  <span className="text-xs text-slate-500">Real bazar qiyməti, əlavə komissiyasız</span>
                </div>
              </div>
            </div>

            {/* Address & Call Action */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200 text-xs shadow-xs">
                <MapPin className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <div>
                  <span className="font-bold text-[#0F172A] block">Ünvanımız:</span>
                  <span className="text-slate-600">{SHOWROOM_ADDRESS}</span>
                </div>
              </div>

              <a
                href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <Phone className="w-4 h-4" />
                <span>Birbaşa zəng et</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

