import Link from 'next/link';

interface MenuModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MenuModal({ isOpen, onClose }: MenuModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-6 rounded-lg shadow-2xl w-full max-w-xs mx-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col space-y-3">
                    <Link href="/logout" onClick={onClose} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2.5 px-4 rounded focus:outline-none focus:shadow-outline text-center">Cerrar Sesión</Link>
                    <button onClick={onClose} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2.5 px-4 rounded focus:outline-none focus:shadow-outline text-center">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
