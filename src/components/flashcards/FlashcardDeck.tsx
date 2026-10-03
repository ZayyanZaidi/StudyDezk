import React, { useState, useEffect } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { Flashcard } from '../../types/flashcard';
import {
  RotateCw,
  CheckCircle,
  XCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  ListFilter,
  Layers,
} from 'lucide-react';

export const FlashcardDeck: React.FC = () => {
  const { activeDocumentId, documents, flashcards, reviewFlashcard, selectedCourse } = useStudyStore();
  const currentDoc = documents.find((d) => d.id === activeDocumentId);

  // Filter flashcards: for active document or current course
  const docCards = flashcards.filter((c) => {
    if (activeDocumentId && c.documentId === activeDocumentId) return true;
    if (!activeDocumentId && selectedCourse !== 'All Courses') return c.course === selectedCourse;
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'study' | 'list'>('study');
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(docCards);

  useEffect(() => {
    setShuffledCards(docCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [docCards.length, activeDocumentId]);

  const currentCard = shuffledCards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < shuffledCards.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : shuffledCards.length - 1));
  };

  const handleShuffle = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReview = (known: boolean) => {
    if (!currentCard) return;
    reviewFlashcard(currentCard.id, known);
    handleNext();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'study') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, shuffledCards.length]);

  if (shuffledCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Flashcards Found
        </h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Flashcards are automatically synthesized from definition patterns (&quot;X is defined as Y&quot;, &quot;X refers to Y&quot;) and acronyms.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black p-4 sm:p-6 lg:p-8">
      {/* Top Bar Controls */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
            Card {currentIndex + 1} of {shuffledCards.length}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 font-semibold">
            {currentCard?.course}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'study' ? 'list' : 'study')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            {viewMode === 'study' ? <ListFilter className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
            <span>{viewMode === 'study' ? 'View All' : 'Practice'}</span>
          </button>
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
            title="Shuffle deck"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'study' ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 min-h-0 overflow-y-auto py-2">
          {/* Card Component with 3D Flip */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full aspect-[16/10] max-h-[48vh] sm:max-h-96 rounded-3xl bg-neutral-50 dark:bg-neutral-950 p-5 sm:p-8 shadow-xs border border-neutral-200 dark:border-neutral-800 cursor-pointer select-none transition-all duration-300 hover:border-neutral-400 dark:hover:border-neutral-700 flex flex-col justify-between relative group overflow-y-auto"
          >
            {/* Header tag */}
            <div className="flex items-center justify-between text-xs text-neutral-400 shrink-0">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-700 dark:text-neutral-300">
                {isFlipped ? 'Answer / Definition' : 'Prompt / Concept'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                <RotateCw className="w-3 h-3" />
                Click to flip (Space)
              </span>
            </div>

            {/* Content */}
            <div className="my-auto py-3 text-center overflow-y-auto">
              <p
                className={`transition-all leading-relaxed ${
                  isFlipped
                    ? 'text-xs sm:text-sm font-normal text-neutral-800 dark:text-neutral-100 whitespace-pre-line text-left'
                    : 'text-base sm:text-lg font-serif font-bold text-neutral-950 dark:text-white'
                }`}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Footer pattern info */}
            <div className="pt-2 sm:pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Rule: {currentCard.sourcePattern.replace('_', ' ')}
              </span>
              <span>
                Known: {currentCard.reviewState.knownCount} • Interval: {currentCard.reviewState.interval}d
              </span>
            </div>
          </div>

          {/* Navigation & Review Actions */}
          <div className="w-full flex items-center justify-between gap-3 sm:gap-4 shrink-0">
            <button
              onClick={handlePrev}
              className="p-2.5 sm:p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleReview(false)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Need Review</span>
              </button>
              <button
                onClick={() => handleReview(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Got It</span>
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-2.5 sm:p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* List Mode */
        <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full space-y-3 min-h-0">
          {shuffledCards.map((card, i) => (
            <div
              key={card.id}
              className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">Card #{i + 1}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {card.sourcePattern}
                </span>
              </div>
              <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                {card.front}
              </h5>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line font-normal">
                {card.back}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
