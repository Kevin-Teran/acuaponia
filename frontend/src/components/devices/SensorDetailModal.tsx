/**
 * @file SensorDetailModal.tsx
 * @description Componente modal para mostrar los detalles de un tanque, incluyendo sus sensores.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */

import { Tank } from '@/types';
import Modal from '@/components/common/Modal'; // Asumiendo que tienes un componente Modal genérico

/**
 * @typedef {object} SensorDetailModalProps
 * @property {Tank} tank - El objeto del tanque a mostrar.
 * @property {() => void} onClose - Función para cerrar el modal.
 */
interface SensorDetailModalProps {
    tank: Tank;
    onClose: () => void;
}

/**
 * @function SensorDetailModal
 * @param {SensorDetailModalProps} props - Propiedades del componente.
 * @returns {JSX.Element}
 */
const SensorDetailModal = ({ tank, onClose }: SensorDetailModalProps) => {
    return (
        <Modal title="Detalles del Tanque" onClose={onClose}>
            <div className="p-4 text-gray-200">
                <div className="mb-4">
                    <h3 className="font-bold text-lg">Nombre</h3>
                    <p>{tank.name}</p>
                </div>
                <div className="mb-4">
                    <h3 className="font-bold text-lg">Descripción</h3>
                    <p>{tank.description || 'Sin descripción'}</p>
                </div>
                <div>
                    <h3 className="font-bold text-lg">Sensores Vinculados</h3>
                    {tank.sensors && tank.sensors.length > 0 ? (
                        <ul className="list-disc list-inside mt-2">
                            {tank.sensors.map(sensor => (
                                <li key={sensor.id}>{sensor.name} ({sensor.type})</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No hay sensores vinculados a este tanque.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default SensorDetailModal;