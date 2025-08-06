// types/survey.ts

import { Timestamp } from "firebase/firestore";

// Define a estrutura de uma recompensa por responder a pesquisa
export interface Reward {
  hasReward: boolean;
  type: string;       // Ex: "Cupom de Desconto", "Crédito para Consumo"
  description: string; // Ex: "10% OFF na próxima estadia", "R$20 em nosso bar"
}

// Define os tipos de perguntas disponíveis
export type QuestionType =
  | 'rating_5_stars'
  | 'multiple_choice'
  | 'nps_0_10'
  | 'text'
  | 'separator'
  | 'comment_box';

// Define uma categoria para agrupar perguntas (KPIs)
export interface SurveyCategory {
    id: string;
    name: string;
    order: number;
}

// Define a estrutura de uma única pergunta na pesquisa
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  subtitle?: string;
  categoryId?: string;
  categoryName?: string;
  options?: string[];
  allowMultiple?: boolean;
  position: number;
}

// Define a estrutura principal de uma pesquisa
export interface Survey {
  id: string;
  title: string;
  description: string;
  isDefault: boolean;
  questions: SurveyQuestion[];
  reward: Reward; // Campo de recompensa adicionado
}

// Define a estrutura de uma única resposta dentro de uma pesquisa respondida
export interface SurveyResponseAnswer {
    questionId: string;
    questionText?: string;
    answer: any;
}

// Define a estrutura de uma pesquisa que foi respondida por um hóspede
export interface SurveyResponse {
    id: string;
    surveyId: string;
    stayId: string;
    submittedAt: Timestamp;
    answers: SurveyResponseAnswer[];
}