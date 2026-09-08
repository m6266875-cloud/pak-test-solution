import { Response, NextFunction } from 'express';
import { PaperGeneratorService } from '../services/paperGeneratorService';
import { PDFGeneratorService } from '../services/pdfGeneratorService';
import { AuthRequest } from '../middleware/auth';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { PaperStatus } from '@prisma/client';

const paperService = new PaperGeneratorService();
const pdfService = new PDFGeneratorService();

export const generatePaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paper = await paperService.generatePaper({
      ...req.body,
      teacherId: req.user!.id,
      createdById: req.user!.id,
    });
    successResponse(res, paper, 'Paper generated successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getPaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paper = await paperService.getPaperById(Number(req.params.id), req.user!.id);
    successResponse(res, paper, 'Paper fetched');
  } catch (err) {
    next(err);
  }
};

export const listPapers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as PaperStatus | undefined;
    const { papers, total } = await paperService.listPapers(req.user!.id, page, limit, status);
    paginatedResponse(res, papers, total, page, limit, 'Papers fetched');
  } catch (err) {
    next(err);
  }
};

export const updatePaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, status } = req.body;
    const paperId = Number(req.params.id);
    if (title) await paperService.updatePaperTitle(paperId, req.user!.id, title);
    if (status) await paperService.updatePaperStatus(paperId, req.user!.id, status as PaperStatus);
    successResponse(res, null, 'Paper updated');
  } catch (err) {
    next(err);
  }
};

export const updateFormatting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await paperService.updatePaperFormatting(
      Number(req.params.id),
      req.user!.id,
      req.body
    );
    successResponse(res, updated, 'Formatting updated');
  } catch (err) {
    next(err);
  }
};

export const deletePaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await paperService.deletePaper(Number(req.params.id), req.user!.id);
    successResponse(res, null, 'Paper deleted');
  } catch (err) {
    next(err);
  }
};

export const downloadPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await pdfService.generatePDF(
      Number(req.params.id),
      req.user!.id
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const previewPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { buffer } = await pdfService.generatePDF(Number(req.params.id), req.user!.id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
