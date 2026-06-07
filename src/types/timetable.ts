export interface TimeSlotGoal {
  id: string;
  hour: number;
  bookId: string;
  chapterId: string;
  startPage: number;
  endPage: number;
  memo?: string;
}
