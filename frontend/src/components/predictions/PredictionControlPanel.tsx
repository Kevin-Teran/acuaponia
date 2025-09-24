/**
 * @file PredictionControlPanel.tsx
 * @route frontend/src/components/predictions
 * @description Panel de control para la página de predicciones, consistente con el de Analíticas.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import React from 'react';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { User, Tank } from '@/types';

interface PredictionControlPanelProps {
	users: User[];
	selectedUserId: string;
	onUserChange: (id: string) => void;
	isAdmin: boolean;
	tanks: Tank[];
	selectedTankId: string;
	onTankChange: (id: string) => void;
	horizon: string;
	onHorizonChange: (h: string) => void;
	isLoading: boolean;
	horizonOptions: { label: string; value: string }[];
}

export const PredictionControlPanel = ({
	users,
	selectedUserId,
	onUserChange,
	isAdmin,
	tanks,
	selectedTankId,
	onTankChange,
	horizon,
	onHorizonChange,
	isLoading,
	horizonOptions,
}: PredictionControlPanelProps) => {
	return (
		<Card className="sticky top-6">
			<div className="space-y-6">
				<h2 className="text-xl font-bold text-text-primary">Controles</h2>
				
				{isLoading && (
					<div className="space-y-4">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				)}

				{!isLoading && (
					<div className="space-y-4">
						{/* Selector de Usuario (Solo Admin) */}
						{isAdmin && (
							<div>
								<label htmlFor="user-select" className="label">
									Usuario
								</label>
								<select
									id="user-select"
									value={selectedUserId}
									onChange={(e) => onUserChange(e.target.value)}
									className="form-select"
								>
									{users.map((user) => (
										<option key={user.id} value={user.id}>
											{user.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Selector de Tanque */}
						<div>
							<label htmlFor="tank-select" className="label">
								Tanque
							</label>
							<select
								id="tank-select"
								value={selectedTankId}
								onChange={(e) => onTankChange(e.target.value)}
								className="form-select"
								disabled={tanks.length === 0}
							>
								{tanks.length > 0 ? (
									tanks.map((tank) => (
										<option key={tank.id} value={tank.id}>
											{tank.name}
										</option>
									))
								) : (
									<option>No hay tanques</option>
								)}
							</select>
						</div>

						{/* Selector de Horizonte */}
						<div>
							<label htmlFor="horizon-select" className="label">
								Horizonte de Predicción
							</label>
							<select
								id="horizon-select"
								value={horizon}
								onChange={(e) => onHorizonChange(e.target.value)}
								className="form-select"
								disabled={!selectedTankId}
							>
								{horizonOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
};