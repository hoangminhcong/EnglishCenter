import CourseCard from '@/features/courses/components/CourseCard'
import type { Course } from '@/features/courses/types'

interface CourseListProps {
  courses: Course[]
  onConsultClick: (course: Course) => void
}

export default function CourseList({ courses, onConsultClick }: CourseListProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onConsultClick={onConsultClick} />
      ))}
    </div>
  )
}
