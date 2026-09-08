import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticate, requireSchoolAdmin } from '../middleware/auth';
import {
  listBoards, createBoard, updateBoard, deleteBoard,
  listBooks, getBook, createBook, updateBook, deleteBook,
  listChapterTree, attachChapterToBook,
  listExercises, createExercise, updateExercise, deleteExercise,
  listTopics, createTopic, updateTopic, deleteTopic,
} from '../controllers/syllabusController';

const router = Router();
router.use(authenticate);

const boardValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Board name is required'),
  body('code').trim().isLength({ min: 2 }).withMessage('Board code is required'),
];

const bookValidation = [
  body('title').trim().isLength({ min: 2 }).withMessage('Book title is required'),
  body('language').optional().isIn(['english', 'urdu', 'bilingual']).withMessage('Invalid language'),
  body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
  body('year').optional({ nullable: true }).isInt({ min: 1900, max: 2100 }).withMessage('Invalid year'),
];

const exerciseValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Exercise name is required'),
  body('chapterId').isInt({ min: 1 }).withMessage('Valid chapterId required'),
];

const topicValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Topic name is required'),
  body('chapterId').isInt({ min: 1 }).withMessage('Valid chapterId required'),
];

// Boards
router.get('/boards',          listBoards);
router.post('/boards',         requireSchoolAdmin, validate(boardValidation), createBoard);
router.put('/boards/:id',      requireSchoolAdmin, updateBoard);
router.delete('/boards/:id',   requireSchoolAdmin, deleteBoard);

// Books
router.get('/books',           listBooks);
router.get('/books/:id',       getBook);
router.post('/books',          requireSchoolAdmin, validate(bookValidation), createBook);
router.put('/books/:id',       requireSchoolAdmin, updateBook);
router.delete('/books/:id',    requireSchoolAdmin, deleteBook);

// Chapters (book hierarchy drill-down)
router.get('/chapters',        listChapterTree);
router.put('/chapters/:id/book', requireSchoolAdmin, attachChapterToBook);

// Exercises
router.get('/exercises',       listExercises);
router.post('/exercises',      requireSchoolAdmin, validate(exerciseValidation), createExercise);
router.put('/exercises/:id',   requireSchoolAdmin, updateExercise);
router.delete('/exercises/:id', requireSchoolAdmin, deleteExercise);

// Topics
router.get('/topics',          listTopics);
router.post('/topics',         requireSchoolAdmin, validate(topicValidation), createTopic);
router.put('/topics/:id',      requireSchoolAdmin, updateTopic);
router.delete('/topics/:id',   requireSchoolAdmin, deleteTopic);

export default router;
