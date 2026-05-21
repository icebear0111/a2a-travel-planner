'use client';

import { useState } from 'react';
import {
  X,
  Check,
  Plus,
  GripVertical,
  Trash2,
  MapPin,
  Utensils,
  Coffee,
  Camera,
  Train,
  Loader2,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { useAuthStore } from '@/stores/authStore';
import { ActivityType } from '@/types/trip';

interface EditScreenProps {
  onBack: () => void;
}

export default function EditScreen({ onBack }: EditScreenProps) {
  const {
    scheduleData,
    selectedDay,
    setSelectedDay,
    updateScheduleItem,
    deleteScheduleItem,
    addScheduleItem,
    moveScheduleItem,
    persistCurrentTrip,
    isSaving,
  } = useTripStore();
  const { user } = useAuthStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const currentDaySchedule = scheduleData.find((d) => d.day === selectedDay);
  const items = currentDaySchedule ? currentDaySchedule.activities : [];

  const handleInputChange = (id: string, field: string, value: string) => {
    updateScheduleItem(selectedDay, id, { [field]: value });
  };

  const handleNumberChange = (id: string, field: string, value: string) => {
    updateScheduleItem(selectedDay, id, { [field]: Number(value) || 0 });
  };

  const handleAddActivity = (type: ActivityType = 'etc') => {
    const templates: Record<ActivityType, { title: string; desc: string; duration: string }> = {
      flight: { title: '항공 이동', desc: '항공편 정보', duration: '2시간' },
      hotel: { title: '숙소 체크인', desc: '숙소 일정', duration: '1시간' },
      food: { title: '식사', desc: '직접 추가한 맛집', duration: '1시간' },
      coffee: { title: '카페', desc: '잠깐 쉬어가는 시간', duration: '1시간' },
      sightseeing: { title: '관광지 방문', desc: '직접 추가한 명소', duration: '1시간 30분' },
      theme: { title: '테마 체험', desc: '예약 또는 티켓 확인 필요', duration: '2시간' },
      shopping: { title: '쇼핑', desc: '쇼핑 일정', duration: '1시간 30분' },
      transport: { title: '이동', desc: '다음 장소로 이동', duration: '30분' },
      etc: { title: '새 일정', desc: '직접 추가한 일정', duration: '1시간' },
    };

    addScheduleItem(selectedDay, {
      type,
      ...templates[type],
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteScheduleItem(selectedDay, id);
    }
  };

  const handleSave = async () => {
    if (user) {
      await persistCurrentTrip(user.uid);
    }
    onBack();
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId) return;
    moveScheduleItem(selectedDay, draggingId, targetId);
    setDraggingId(null);
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900 pb-20">
      {/* 1. 헤더 (고정) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-500 hover:text-black transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">Edit Schedule</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 -mr-2 text-black hover:bg-slate-100 rounded-full transition-colors disabled:text-slate-300"
          >
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* 2. 날짜 선택 (가로 스크롤) */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide mb-2">
          {scheduleData.map((dayItem) => (
            <button
              key={dayItem.day}
              onClick={() => setSelectedDay(dayItem.day)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${
                selectedDay === dayItem.day
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              Day {dayItem.day}
            </button>
          ))}
        </div>

        {/* 3. 편집 리스트 영역 */}
        <div className="space-y-3 mb-8">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">일정이 없습니다.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggingId(item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(item.id)}
                className={`group bg-white border rounded-2xl p-3 shadow-sm transition-all ${
                  draggingId === item.id
                    ? 'border-black opacity-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 드래그 핸들 */}
                  <div className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* 시간 입력 */}
                  <div className="w-16">
                    <input
                      type="text"
                      value={item.time}
                      onChange={(e) => handleInputChange(item.id, 'time', e.target.value)}
                      className="w-full text-sm font-bold text-slate-900 bg-slate-50 border-transparent rounded-lg py-1 px-2 text-center focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition-all"
                    />
                  </div>

                  {/* 내용 입력 */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleInputChange(item.id, 'title', e.target.value)}
                      className="w-full font-medium text-slate-900 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-400"
                      placeholder="Activity Name"
                    />
                    <input
                      type="text"
                      value={item.desc}
                      onChange={(e) => handleInputChange(item.id, 'desc', e.target.value)}
                      className="w-full text-xs text-slate-400 bg-transparent border-none p-0 focus:ring-0 mt-0.5 placeholder:text-slate-300"
                      placeholder="Description"
                    />
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pl-10">
                  <select
                    value={item.type}
                    onChange={(e) =>
                      updateScheduleItem(selectedDay, item.id, {
                        type: e.target.value as ActivityType,
                      })
                    }
                    className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="sightseeing">관광</option>
                    <option value="food">식사</option>
                    <option value="coffee">카페</option>
                    <option value="shopping">쇼핑</option>
                    <option value="transport">이동</option>
                    <option value="theme">체험</option>
                    <option value="hotel">숙소</option>
                    <option value="flight">항공</option>
                    <option value="etc">기타</option>
                  </select>
                  <input
                    type="text"
                    value={item.duration}
                    onChange={(e) => handleInputChange(item.id, 'duration', e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="소요시간"
                  />
                  <input
                    type="number"
                    value={item.price || 0}
                    onChange={(e) => handleNumberChange(item.id, 'price', e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="비용"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. 추가 버튼 & 빠른 액션 */}
        <div className="space-y-6">
          <button
            onClick={() => handleAddActivity()}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium flex items-center justify-center gap-2 hover:border-slate-400 hover:text-slate-600 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Add New Activity
          </button>

          {/* 빠른 추가 칩 */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">
              Quick Add
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Utensils, label: 'Restaurant', type: 'food' as ActivityType },
                { icon: Coffee, label: 'Cafe', type: 'coffee' as ActivityType },
                { icon: Camera, label: 'Spot', type: 'sightseeing' as ActivityType },
                { icon: MapPin, label: 'Location', type: 'etc' as ActivityType },
                { icon: Train, label: 'Transport', type: 'transport' as ActivityType },
              ].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleAddActivity(chip.type)}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-black hover:text-white hover:border-black transition-all"
                >
                  <chip.icon className="w-4 h-4" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
