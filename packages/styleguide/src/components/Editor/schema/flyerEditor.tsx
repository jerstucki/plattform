import { SchemaConfig } from '../custom-types'
import { EditorQuizContainer, EditorQuizItem } from '../../Flyer/Quiz'
import { Flyer } from '../../Typography'

const schema: SchemaConfig = {
  link: Flyer.NoRefA,
  quizItem: EditorQuizItem,
  quiz: EditorQuizContainer,
}

export default schema
