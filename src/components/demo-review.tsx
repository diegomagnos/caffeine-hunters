"use client";
import { useState } from "react";
import { sensoryAttributes } from "@/demo/data";
export function DemoReview() {
  const [rating, setRating] = useState<number | null>(null);
  return (
    <section className="card" aria-labelledby="review-title">
      <h2 id="review-title">Sua experiência na xícara</h2>
      <p id="review-help">
        Experimente os campos com impressões fictícias. Tudo fica apenas nesta
        tela e se perde ao sair ou atualizar. Nada é enviado ou salvo.
      </p>
      <div className="sensory-grid">
        {sensoryAttributes.map((attribute) => (
          <div key={attribute}>
            <label htmlFor={`sensory-${attribute}`}>{attribute}</label>
            <input
              id={`sensory-${attribute}`}
              type="text"
              maxLength={200}
              autoComplete="off"
              placeholder="Sua impressão fictícia"
              aria-describedby="sensory-help"
            />
          </div>
        ))}
      </div>
      <p className="small" id="sensory-help">
        Observações livres apenas para explorar os cinco atributos. A escala e a
        obrigatoriedade sensorial ainda dependem de decisão.
      </p>
      <fieldset aria-describedby="rating-help">
        <legend>Nota geral · de 1 a 5 estrelas</legend>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`}
              />
              <span
                aria-hidden="true"
                className={rating !== null && value <= rating ? "selected" : ""}
              >
                ★
              </span>
            </label>
          ))}
        </div>
        <p aria-live="polite">
          {rating === null
            ? "Nenhuma nota selecionada"
            : `Seleção local: ${rating} de 5 estrelas`}
        </p>
        <p id="rating-help" className="small">
          A nota geral é sua escolha direta, independente dos atributos.
          Estrelas inteiras são uma amostra de interface; a precisão final ainda
          depende de decisão.
        </p>
      </fieldset>
      <button type="button" disabled aria-describedby="unavailable">
        Registrar avaliação · indisponível
      </button>
      <p id="unavailable" className="small">
        O registro e a edição auditada ainda não estão disponíveis. Selecionar
        estrelas não registra uma avaliação nem libera resultados.
      </p>
    </section>
  );
}
