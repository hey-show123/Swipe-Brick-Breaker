import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface RankingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose }) => {
    const [scores, setScores] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Read scores or just best score.
            // Since we only track "sbb_best_score" currently, let's fake a list or upgrade the storage
            // UPGRADE: Let's read sbb_high_scores array if exists, else init with best_score
            const savedList = localStorage.getItem('sbb_high_scores');
            let list: number[] = [];

            if (savedList) {
                list = JSON.parse(savedList);
            } else {
                const singleBest = localStorage.getItem('sbb_best_score');
                if (singleBest) list = [parseInt(singleBest)];
            }

            // Ensure sorted and top 5
            list.sort((a, b) => b - a);
            setScores(list.slice(0, 5));
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="LEADERBOARD">
            <div className="flex flex-col gap-2">
                {scores.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No records yet. Play now!</div>
                ) : (
                    scores.map((score, index) => (
                        <div
                            key={index}
                            className={clsx(
                                "flex items-center justify-between p-4 rounded-xl border",
                                index === 0
                                    ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
                                    : "bg-white/5 border-white/5"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-8 h-8 flex items-center justify-center rounded-full font-black text-sm",
                                    index === 0 ? "bg-yellow-500 text-black" :
                                        index === 1 ? "bg-gray-300 text-black" :
                                            index === 2 ? "bg-amber-700 text-white" :
                                                "bg-gray-800 text-gray-500"
                                )}>
                                    {index + 1}
                                </div>
                                <span className={clsx(
                                    "font-mono font-bold text-lg",
                                    index === 0 ? "text-yellow-400" : "text-white"
                                )}>
                                    {score.toLocaleString()}
                                </span>
                            </div>
                            {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};
